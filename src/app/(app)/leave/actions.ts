"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { leaveSchema } from "@/lib/validation";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { adjustUsage } from "@/lib/services/leave-balance";
import { notifyAdmins, notifyUser } from "@/lib/services/notify";
import { Decimal } from "decimal.js";

type ActionState = { error?: string };

/** Inclusive whole-day count between two dates. */
function dayCount(from: Date, to: Date): number {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to); b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return Math.max(1, diff);
}

/** Employee applies for leave (spec §19). */
export async function applyLeave(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.LEAVE_SELF);
  if (!user.employeeId) return { error: "No employee profile linked to your account." };
  const parsed = leaveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  if (d.toDate < d.fromDate) return { error: "End date cannot be before start date." };

  // Half-day only makes sense for a single day.
  const sameDay = d.fromDate.getTime() === d.fromDate.getTime() && dayCount(d.fromDate, d.toDate) === 1;
  if (d.duration === "HALF" && !sameDay) {
    return { error: "Half-day leave must have the same From and To date." };
  }
  const days = d.duration === "HALF" ? new Decimal("0.5") : new Decimal(dayCount(d.fromDate, d.toDate));

  const created = await prisma.leaveRequest.create({
    data: {
      employeeId: user.employeeId, type: d.type, fromDate: d.fromDate, toDate: d.toDate,
      days: days.toFixed(1), reason: d.reason, status: "PENDING",
    },
    include: { employee: true },
  });
  await notifyAdmins(
    "New leave request",
    `${created.employee.name} requested ${created.type} leave`,
    "/leave",
  );
  revalidatePath("/leave");
  return {};
}

/** Employee cancels their own pending request. */
export async function cancelLeave(leaveId: string): Promise<void> {
  const user = await assertPermission(PERMISSIONS.LEAVE_SELF);
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave || leave.employeeId !== user.employeeId || leave.status !== "PENDING") return;
  await prisma.leaveRequest.update({ where: { id: leaveId }, data: { status: "CANCELLED" } });
  revalidatePath("/leave");
}

/** Admin approves or rejects (spec §19). On APPROVED, deduct the leave balance. */
export async function decideLeave(leaveId: string, decision: "APPROVED" | "REJECTED", formData: FormData): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.LEAVE_MANAGE);
  const note = String(formData.get("note") ?? "").trim();
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave || leave.status !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: leaveId },
      data: { status: decision, decidedById: admin.id, decidedAt: new Date(), decisionNote: note || null },
    });
    if (decision === "APPROVED") {
      await adjustUsage(tx, {
        employeeId: leave.employeeId,
        year: leave.fromDate.getFullYear(),
        type: leave.type,
        days: new Decimal(leave.days.toString()),
        direction: "deduct",
      });
    }
  });

  // Notify the employee of the decision.
  const emp = await prisma.employee.findUnique({ where: { id: leave.employeeId }, select: { userId: true } });
  if (emp?.userId) {
    await notifyUser(emp.userId, `Leave ${decision.toLowerCase()}`, `Your ${leave.type} leave was ${decision.toLowerCase()}.`, "/leave");
  }

  await writeAudit({ userId: admin.id, action: AUDIT.LEAVE_DECISION, entity: "LeaveRequest", entityId: leaveId, after: { decision } });
  revalidatePath("/leave");
}

/** Admin manually sets an employee's allocated quota for a leave type/year. */
export async function adjustBalance(formData: FormData): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.LEAVE_MANAGE);
  const employeeId = String(formData.get("employeeId") ?? "");
  const year = Number(formData.get("year"));
  const type = String(formData.get("type") ?? "") as "CASUAL" | "SICK" | "PAID" | "UNPAID" | "OTHER";
  const allocated = Number(formData.get("allocated"));
  if (!employeeId || !year || !type || Number.isNaN(allocated) || allocated < 0) return;

  await prisma.leaveBalance.upsert({
    where: { employeeId_year_type: { employeeId, year, type } },
    update: { allocated: new Decimal(allocated).toFixed(1) },
    create: { employeeId, year, type, allocated: new Decimal(allocated).toFixed(1), used: "0.0" },
  });
  await writeAudit({ userId: admin.id, action: "LEAVE_BALANCE_ADJUST", entity: "LeaveBalance", entityId: employeeId, after: { type, allocated } });
  revalidatePath("/leave");
}
