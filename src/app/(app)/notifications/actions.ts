"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";

/** Mark one notification read (only the owner's own). */
export async function markRead(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id }, // scope: can only touch own
    data: { isRead: true },
  });
  revalidatePath("/");
}

/** Mark all of the current user's notifications read. */
export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/");
}
