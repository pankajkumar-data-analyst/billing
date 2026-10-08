"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission, currentUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { z } from "zod";

type ActionState = { error?: string };

const taskSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  notes: z.string().optional(),
});

/** Create a task/reminder. Anyone with CANDIDATE_VIEW (i.e. staff) can create. */
export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) return { error: "Not authenticated" };
  const parsed = taskSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  await prisma.task.create({
    data: {
      title: d.title,
      // Default: assign to self (if the user is an employee) unless chosen.
      assigneeId: d.assigneeId || user.employeeId || null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      priority: d.priority,
      notes: d.notes,
      status: "OPEN",
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return {};
}

/** Toggle a task between OPEN and DONE. Assignee or admin only. */
export async function toggleTask(taskId: string): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  const isAdmin = user.permissions.includes(PERMISSIONS.USER_MANAGE);
  const isOwner = task.assigneeId && task.assigneeId === user.employeeId;
  if (!isAdmin && !isOwner) return; // server-side scope

  await prisma.task.update({
    where: { id: taskId },
    data: { status: task.status === "DONE" ? "OPEN" : "DONE" },
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
