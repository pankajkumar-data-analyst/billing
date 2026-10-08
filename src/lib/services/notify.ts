import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/rbac";

/**
 * In-app notifications (spec §26). Best-effort — a failure here must never
 * break the triggering action, so callers wrap in try/catch or ignore errors.
 */

export async function notifyUser(userId: string, title: string, body?: string, link?: string) {
  try {
    await prisma.notification.create({ data: { userId, title, body, link } });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/** Notify every Super Admin (e.g. leave request, invoice overdue). */
export async function notifyAdmins(title: string, body?: string, link?: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { isActive: true, role: { name: ROLES.SUPER_ADMIN } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: admins.map((a) => ({ userId: a.id, title, body, link })),
    });
  } catch (err) {
    console.error("[notifyAdmins] failed:", err);
  }
}
