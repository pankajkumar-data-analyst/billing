"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { getSettings } from "@/lib/services/settings";
import { evaluateAttendance, isLate } from "@/lib/services/attendance";
import { headers } from "next/headers";

/** The local date (midnight) for "today" — stored as a DATE column. */
function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Clock in (spec §17, §49). One attendance row per employee per day. Employees
 * cannot edit attendance directly — only clock in/out; corrections go through
 * a regularization request (Phase 2). Enforced server-side.
 */
export async function clockIn(): Promise<{ error?: string }> {
  const user = await assertPermission(PERMISSIONS.ATTENDANCE_SELF);
  if (!user.employeeId) return { error: "No employee profile linked to your account." };

  const date = todayDate();
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: user.employeeId, date } },
  });
  if (existing?.clockIn) return { error: "Already clocked in today." };

  const settings = await getSettings();
  const now = new Date();
  const late = isLate(now, {
    officeStartTime: settings.officeStartTime,
    officeEndTime: settings.officeEndTime,
    graceMinutes: settings.graceMinutes,
    halfDayHours: Number(settings.halfDayHours),
    fullDayHours: Number(settings.fullDayHours),
  });
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim();

  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: user.employeeId, date } },
    create: { employeeId: user.employeeId, date, clockIn: now, status: late ? "LATE" : "PRESENT", isLate: late, clockInIp: ip },
    update: { clockIn: now, status: late ? "LATE" : "PRESENT", isLate: late, clockInIp: ip },
  });
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return {};
}

/** Clock out — computes worked minutes and final day status. */
export async function clockOut(): Promise<{ error?: string }> {
  const user = await assertPermission(PERMISSIONS.ATTENDANCE_SELF);
  if (!user.employeeId) return { error: "No employee profile linked to your account." };

  const date = todayDate();
  const row = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: user.employeeId, date } },
  });
  if (!row?.clockIn) return { error: "You haven't clocked in today." };
  if (row.clockOut) return { error: "Already clocked out today." };

  const settings = await getSettings();
  const now = new Date();
  const result = evaluateAttendance(row.clockIn, now, {
    officeStartTime: settings.officeStartTime,
    officeEndTime: settings.officeEndTime,
    graceMinutes: settings.graceMinutes,
    halfDayHours: Number(settings.halfDayHours),
    fullDayHours: Number(settings.fullDayHours),
  });

  await prisma.attendance.update({
    where: { id: row.id },
    data: { clockOut: now, workedMinutes: result.workedMinutes, status: result.status, isLate: result.isLate },
  });
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return {};
}
