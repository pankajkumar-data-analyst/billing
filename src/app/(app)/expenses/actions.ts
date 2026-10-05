"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { toDbString } from "@/lib/money";
import { z } from "zod";

const expenseSchema = z.object({
  expenseDate: z.coerce.date(),
  category: z.string().min(1, "Category required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  vendor: z.string().optional(),
  paymentMethod: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type ActionState = { error?: string };

export async function createExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertPermission(PERMISSIONS.EXPENSE_MANAGE);
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  await prisma.expense.create({
    data: {
      expenseDate: d.expenseDate, category: d.category, amount: toDbString(d.amount),
      vendor: d.vendor, paymentMethod: d.paymentMethod, description: d.description, notes: d.notes,
    },
  });
  revalidatePath("/expenses");
  redirect("/expenses");
}
