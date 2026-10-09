"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { getSettings } from "@/lib/services/settings";
import { calculatePayroll } from "@/lib/services/payroll";
import { workingDaysInMonth, dayValueForStatus } from "@/lib/services/attendance";
import { workingDayHolidayCount, holidaysInMonth } from "@/lib/services/holidays";
import { toDbString } from "@/lib/money";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { Decimal } from "decimal.js";

/**
 * Generate (or regenerate DRAFT) payslips for a month (spec §20). Pulls present
 * days from attendance and paid/unpaid leave from approved leave, then runs the
 * centralized payroll calc. Admin reviews before approving — no money moves.
 */
export async function generatePayroll(
  _prev: { error?: string; ok?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const admin = await assertPermission(PERMISSIONS.PAYROLL_PROCESS);
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month")); // 1-12
  if (!year || !month) return { error: "Please choose a month and year." };

  const settings = await getSettings();
  const weeklyOff = settings.weeklyOff.split(",").map((s) => s.trim());
  // Working days = calendar working days minus company holidays that land on a
  // working day, so holidays are never counted as Loss of Pay.
  const holidayCount = await workingDayHolidayCount(year, month, weeklyOff);
  const workingDays = Math.max(1, workingDaysInMonth(year, month, weeklyOff) - holidayCount);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // Only employees with a monthly salary set can be paid.
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE", monthlySalary: { not: null } },
  });

  if (employees.length === 0) {
    const activeCount = await prisma.employee.count({ where: { status: "ACTIVE" } });
    return {
      error:
        activeCount === 0
          ? "No active employees found. Add an employee first."
          : "No active employee has a Monthly Salary set. Open Employees → edit an employee → set Monthly Salary (Admin only), then generate payroll again.",
    };
  }

  // Precompute weekend + holiday day numbers for the month so we can tell
  // whether an attendance record was on a normal working day or an off day.
  const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const offSet = new Set(weeklyOff);
  const holidayMap = await holidaysInMonth(year, month); // key: yyyy-mm-dd
  const isOffDay = (d: Date): boolean => {
    const dow = DAY_ABBR[d.getDay()];
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return offSet.has(dow) || holidayMap.has(key);
  };

  for (const emp of employees) {
    const [attendance, leaves, existing] = await Promise.all([
      prisma.attendance.findMany({ where: { employeeId: emp.id, date: { gte: monthStart, lte: monthEnd } } }),
      prisma.leaveRequest.findMany({ where: { employeeId: emp.id, status: "APPROVED", fromDate: { lte: monthEnd }, toDate: { gte: monthStart } } }),
      prisma.payslip.findUnique({ where: { employeeId_periodYear_periodMonth: { employeeId: emp.id, periodYear: year, periodMonth: month } } }),
    ]);

    // Split attendance: work on a normal day counts toward presentDays; work on
    // a weekend/holiday counts as EXTRA (paid on top).
    let presentDays = new Decimal(0);
    let extraDays = new Decimal(0);
    for (const a of attendance) {
      const value = dayValueForStatus(a.status); // 1, 0.5 or 0
      if (value.isZero()) continue;
      if (isOffDay(a.date)) extraDays = extraDays.plus(value);
      else presentDays = presentDays.plus(value);
    }

    let paidLeave = new Decimal(0);
    let unpaidLeave = new Decimal(0);
    for (const l of leaves) {
      if (l.type === "UNPAID") unpaidLeave = unpaidLeave.plus(l.days);
      else paidLeave = paidLeave.plus(l.days);
    }

    // Preserve any bonus/deductions an admin set on an existing DRAFT slip.
    const result = calculatePayroll({
      monthlySalary: emp.monthlySalary!,
      workingDays,
      presentDays,
      extraDays,
      paidLeaveDays: paidLeave,
      unpaidLeaveDays: unpaidLeave,
      bonus: existing?.bonus ?? 0,
      deductions: existing?.deductions ?? 0,
    });

    const data = {
      workingDays: result.workingDays,
      presentDays: toDbString(result.presentDays),
      extraDays: toDbString(result.extraDays),
      paidLeave: toDbString(result.paidLeave),
      unpaidLeave: toDbString(result.unpaidLeave),
      lopDays: toDbString(result.lopDays),
      grossSalary: toDbString(result.grossSalary),
      lopAmount: toDbString(result.lopAmount),
      extraPay: toDbString(result.extraPay),
      bonus: toDbString(result.bonus),
      deductions: toDbString(result.deductions),
      netSalary: toDbString(result.netSalary),
    };

    await prisma.payslip.upsert({
      where: { employeeId_periodYear_periodMonth: { employeeId: emp.id, periodYear: year, periodMonth: month } },
      // Only overwrite while still DRAFT — never silently change an APPROVED/PAID slip.
      update: existing && existing.status !== "DRAFT" ? {} : data,
      create: { employeeId: emp.id, periodYear: year, periodMonth: month, ...data, status: "DRAFT" },
    });
  }

  await writeAudit({ userId: admin.id, action: AUDIT.PAYROLL_GENERATE, after: { year, month, employees: employees.length } });
  revalidatePath("/payroll");
  return { ok: `Generated ${employees.length} payslip(s). Review below.` };
}

export async function approvePayslip(payslipId: string): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.PAYROLL_PROCESS);
  const slip = await prisma.payslip.findUnique({ where: { id: payslipId } });
  if (!slip || slip.status !== "DRAFT") return;
  await prisma.payslip.update({ where: { id: payslipId }, data: { status: "APPROVED" } });
  await writeAudit({ userId: admin.id, action: AUDIT.PAYROLL_APPROVE, entity: "Payslip", entityId: payslipId });
  revalidatePath("/payroll");
}

/**
 * Reopen an APPROVED or PAID payslip back to DRAFT so it can be edited again
 * (fix a bonus, re-generate, etc.). Admin only; audited. No money moved in
 * Phase 1, so reopening a "Paid" statement is safe.
 */
export async function reopenPayslip(payslipId: string): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.PAYROLL_PROCESS);
  const slip = await prisma.payslip.findUnique({ where: { id: payslipId } });
  if (!slip || slip.status === "DRAFT") return;
  await prisma.payslip.update({ where: { id: payslipId }, data: { status: "DRAFT" } });
  await writeAudit({ userId: admin.id, action: AUDIT.PAYROLL_GENERATE, entity: "Payslip", entityId: payslipId, before: { status: slip.status }, after: { status: "DRAFT" } });
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

/**
 * Admin sets a manual bonus and/or deductions on a DRAFT payslip and the net
 * is recomputed. Only DRAFT slips can be edited (APPROVED/PAID are locked).
 */
export async function setBonusDeductions(payslipId: string, _prev: { error?: string; ok?: boolean } | undefined, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await assertPermission(PERMISSIONS.PAYROLL_PROCESS);
  const bonus = Number(formData.get("bonus") ?? 0);
  const deductions = Number(formData.get("deductions") ?? 0);
  if (Number.isNaN(bonus) || Number.isNaN(deductions) || bonus < 0 || deductions < 0) {
    return { error: "Bonus and deductions must be zero or more." };
  }

  const slip = await prisma.payslip.findUnique({ where: { id: payslipId }, include: { employee: true } });
  if (!slip) return { error: "Payslip not found." };
  if (slip.status !== "DRAFT") return { error: "Only DRAFT payslips can be edited. Already approved/paid." };

  // Recompute using the stored day counts so net stays consistent.
  const result = calculatePayroll({
    monthlySalary: slip.grossSalary,
    workingDays: slip.workingDays,
    presentDays: slip.presentDays,
    extraDays: slip.extraDays,
    paidLeaveDays: slip.paidLeave,
    unpaidLeaveDays: slip.unpaidLeave,
    bonus,
    deductions,
  });

  await prisma.payslip.update({
    where: { id: payslipId },
    data: { bonus: toDbString(result.bonus), deductions: toDbString(result.deductions), netSalary: toDbString(result.netSalary) },
  });
  await writeAudit({ userId: admin.id, action: AUDIT.PAYROLL_GENERATE, entity: "Payslip", entityId: payslipId, after: { bonus, deductions } });
  revalidatePath("/payroll");
  return { ok: true };
}
