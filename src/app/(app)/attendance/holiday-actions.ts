"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { z } from "zod";

type ActionState = { error?: string; ok?: boolean };

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().trim().min(2, "Name is required"),
  recurring: z.string().optional(),
});

/** Add a company holiday (Admin / attendance manager). */
export async function addHoliday(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertPermission(PERMISSIONS.ATTENDANCE_MANAGE);
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const [y, m, day] = d.date.split("-").map(Number);
  if ([y, m, day].some(Number.isNaN)) return { error: "Invalid date." };

  try {
    await prisma.holiday.create({
      data: { date: new Date(y, m - 1, day), name: d.name, recurring: d.recurring === "on" },
    });
  } catch {
    return { error: "That holiday (same date + name) already exists." };
  }
  revalidatePath("/attendance");
  return { ok: true };
}

/** Remove a holiday. */
export async function deleteHoliday(id: string): Promise<void> {
  await assertPermission(PERMISSIONS.ATTENDANCE_MANAGE);
  await prisma.holiday.delete({ where: { id } }).catch(() => {});
  revalidatePath("/attendance");
}
