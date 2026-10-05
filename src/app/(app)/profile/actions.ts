"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";

type ActionState = { error?: string; ok?: boolean };

/** Change own password (spec §30). Verifies current password first. */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const sessionUser = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next !== confirm) return { error: "New passwords do not match." };
  const strength = validatePasswordStrength(next);
  if (strength) return { error: strength };

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return { error: "User not found." };

  const ok = await verifyPassword(user.passwordHash, current);
  if (!ok) return { error: "Current password is incorrect." };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true };
}
