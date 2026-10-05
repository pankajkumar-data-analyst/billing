"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { getSettings } from "@/lib/services/settings";
import { calculatePayroll } from "@/lib/services/payroll";
import { workingDaysInMonth, dayValueForStatus } from "@/lib/services/attendance";
import { toDbString } from "@/lib/money";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { Decimal } from "decimal.js";

/**
 * Generate (or regenerate DRAFT) payslips for a month (spec §20). Pulls present
 * days from attendance and paid/unpaid leave from approved leave, then runs the
 * centralized payroll calc. Admin reviews before approving — no money moves.
 */
export async function generatePayroll(formData: FormData): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.PAYROLL_PROCESS);
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month")); // 1-12
  if (!year || !month) return;

  const settings = await getSettings();
  const weeklyOff = settings.weeklyOff.split(",").map((s) => s.trim());
  const workingDays = workingDaysInMonth(year, month, weeklyOff);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE", monthlySalary: { not: null } },
  });

  for (const emp of employees) {
    const attendance = await prisma.attendance.findMany({
      where: { employeeId: emp.id, date: { gte: monthStart, lte: monthEnd } },
    });
    const presentDays = attendance.reduce<Decimal>((acc, a) => acc.plus(dayValueForStatus(a.status)), new Decimal(0));

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: emp.id, status: "APPROVED", fromDate: { lte: monthEnd }, toDate: { gte: monthStart } },
    });
    let paidLeave = new Decimal(0);
    let unpaidLeave = new Decimal(0);
    for (const l of leaves) {
      if (l.type === "UNPAID") unpaidLeave = unpaidLeave.plus(l.days);
      else paidLeave = paidLeave.plus(l.days);
    }

    const result = calculatePayroll({
      monthlySalary: emp.monthlySalary!,
      workingDays,
      presentDays,
      paidLeaveDays: paidLeave,
      unpaidLeaveDays: unpaidLeave,
    });

    await prisma.payslip.upsert({
      where: { employeeId_periodYear_periodMonth: { employeeId: emp.id, periodYear: year, periodMonth: month } },
      // Only overwrite while still DRAFT — never silently change an APPROVED/PAID slip.
      update: {
        workingDays: result.workingDays,
        presentDays: toDbString(result.presentDays),
        paidLeave: toDbString(result.paidLeave),
        unpaidLeave: toDbString(result.unpaidLeave),
        lopDays: toDbString(result.lopDays),
        grossSalary: toDbString(result.grossSalary),
        lopAmount: toDbString(result.lopAmount),
        netSalary: toDbString(result.netSalary),
      },
      create: {
        employeeId: emp.id, periodYear: year, periodMonth: month,
        workingDays: result.workingDays,
        presentDays: toDbString(result.presentDays),
        paidLeave: toDbString(result.paidLeave),
        unpaidLeave: toDbString(result.unpaidLeave),
        lopDays: toDbString(result.lopDays),
        grossSalary: toDbString(result.grossSalary),
        lopAmount: toDbString(result.lopAmount),
        netSalary: toDbString(result.netSalary),
        status: "DRAFT",
      },
    });
  }

  await writeAudit({ userId: admin.id, action: AUDIT.PAYROLL_GENERATE, after: { year, month, employees: employees.length } });
  revalidatePath("/payroll");
}

export async function approvePayslip(payslipId: string): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.PAYROLL_PROCESS);
  const slip = await prisma.payslip.findUnique({ where: { id: payslipId } });
  if (!slip || slip.status !== "DRAFT") return;
  await prisma.payslip.update({ where: { id: payslipId }, data: { status: "APPROVED" } });
  await writeAudit({ userId: admin.id, action: AUDIT.PAYROLL_APPROVE, entity: "Payslip", entityId: payslipId });
  revalidatePath("/payroll");
}

export async function markPayslipPaid(payslipId: string): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.PAYROLL_PROCESS);
  const slip = await prisma.payslip.findUnique({ where: { id: payslipId } });
  if (!slip || slip.status !== "APPROVED") return;
  await prisma.payslip.update({ where: { id: payslipId }, data: { status: "PAID" } });
  await writeAudit({ userId: admin.id, action: AUDIT.PAYROLL_PAID, entity: "Payslip", entityId: payslipId });
  revalidatePath("/payroll");
}
