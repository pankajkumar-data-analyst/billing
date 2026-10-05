"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { leaveSchema } from "@/lib/validation";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
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

  await prisma.leaveRequest.create({
    data: {
      employeeId: user.employeeId, type: d.type, fromDate: d.fromDate, toDate: d.toDate,
      days: new Decimal(dayCount(d.fromDate, d.toDate)).toFixed(1), reason: d.reason, status: "PENDING",
    },
  });
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

/** Admin approves or rejects (spec §19). */
export async function decideLeave(leaveId: string, decision: "APPROVED" | "REJECTED", formData: FormData): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.LEAVE_MANAGE);
  const note = String(formData.get("note") ?? "").trim();
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave || leave.status !== "PENDING") return;
  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: decision, decidedById: admin.id, decidedAt: new Date(), decisionNote: note || null },
  });
  await writeAudit({ userId: admin.id, action: AUDIT.LEAVE_DECISION, entity: "LeaveRequest", entityId: leaveId, after: { decision } });
  revalidatePath("/leave");
}
