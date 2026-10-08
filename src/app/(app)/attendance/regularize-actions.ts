"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission, currentUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { getSettings } from "@/lib/services/settings";
import { evaluateAttendance } from "@/lib/services/attendance";
import { writeAudit } from "@/lib/auth/audit";
import { notifyAdmins, notifyUser } from "@/lib/services/notify";
import { z } from "zod";

type ActionState = { error?: string; ok?: boolean };

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  requestedIn: z.string().optional(),
  requestedOut: z.string().optional(),
  reason: z.string().trim().min(3, "Please give a reason"),
});

/** Combine a yyyy-mm-dd date with an HH:mm time into a Date. */
function combine(dateStr: string, timeStr?: string): Date | null {
  if (!timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Employee submits a regularization request (spec §17). */
export async function submitRegularization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.ATTENDANCE_SELF);
  if (!user.employeeId) return { error: "No employee profile linked to your account." };
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  if (!d.requestedIn && !d.requestedOut) {
    return { error: "Enter at least a clock-in or clock-out time." };
  }
  const [y, mo, da] = d.date.split("-").map(Number);
  const dateOnly = new Date(y, mo - 1, da);

  await prisma.attendanceCorrection.create({
    data: {
      employeeId: user.employeeId,
      date: dateOnly,
      requestedIn: combine(d.date, d.requestedIn),
      requestedOut: combine(d.date, d.requestedOut),
      reason: d.reason,
      status: "PENDING",
    },
  });
  await notifyAdmins("Attendance regularization request", `${user.name} requested a correction for ${d.date}`, "/attendance");
  revalidatePath("/attendance");
  return { ok: true };
}

/**
 * Admin approves/rejects. On APPROVE, the requested times are written to the
 * attendance row (created if missing) and the status is recomputed from rules.
 */
export async function decideRegularization(correctionId: string, decision: "APPROVED" | "REJECTED", formData: FormData): Promise<void> {
  const admin = await assertPermission(PERMISSIONS.ATTENDANCE_MANAGE);
  const note = String(formData.get("note") ?? "").trim();
  const corr = await prisma.attendanceCorrection.findUnique({ where: { id: correctionId }, include: { employee: true } });
  if (!corr || corr.status !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    await tx.attendanceCorrection.update({
      where: { id: correctionId },
      data: { status: decision, decidedById: admin.id, decidedAt: new Date(), decisionNote: note || null },
    });

    if (decision === "APPROVED") {
      const settings = await getSettings();
      // Determine the final clock-in/out (prefer requested, else existing).
      const existing = await tx.attendance.findUnique({
        where: { employeeId_date: { employeeId: corr.employeeId, date: corr.date } },
      });
      const clockIn = corr.requestedIn ?? existing?.clockIn ?? null;
      const clockOut = corr.requestedOut ?? existing?.clockOut ?? null;

      let workedMinutes = existing?.workedMinutes ?? 0;
      let status = existing?.status ?? "PRESENT";
      let isLate = existing?.isLate ?? false;

      if (clockIn && clockOut) {
        const r = evaluateAttendance(clockIn, clockOut, {
          officeStartTime: settings.officeStartTime,
          officeEndTime: settings.officeEndTime,
          graceMinutes: settings.graceMinutes,
          halfDayHours: Number(settings.halfDayHours),
          fullDayHours: Number(settings.fullDayHours),
        });
        workedMinutes = r.workedMinutes;
        status = r.status;
        isLate = r.isLate;
      }

      await tx.attendance.upsert({
        where: { employeeId_date: { employeeId: corr.employeeId, date: corr.date } },
        update: { clockIn, clockOut, workedMinutes, status, isLate, note: "Regularized" },
        create: { employeeId: corr.employeeId, date: corr.date, clockIn, clockOut, workedMinutes, status, isLate, note: "Regularized" },
      });
    }
  });

  await writeAudit({
    userId: admin.id, action: "ATTENDANCE_CORRECTION", entity: "AttendanceCorrection", entityId: correctionId,
    after: { decision },
  });
  if (corr.employee.userId) {
    await notifyUser(corr.employee.userId, `Attendance correction ${decision.toLowerCase()}`, `Your correction for ${corr.date.toISOString().slice(0, 10)} was ${decision.toLowerCase()}.`, "/attendance");
  }
  revalidatePath("/attendance");
}
