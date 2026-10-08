import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { toCsv, csvResponse } from "@/lib/csv";

export const runtime = "nodejs";

/** GET /api/export/expenses — Admin-only CSV of all expenses. */
export async function GET() {
  const user = await currentUser();
  if (!user || !hasPermission(user, PERMISSIONS.EXPENSE_VIEW)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const expenses = await prisma.expense.findMany({ orderBy: { expenseDate: "desc" } });
  const csv = toCsv(
    ["Date", "Category", "Vendor", "Amount", "Payment Method", "Description"],
    expenses.map((e) => [
      e.expenseDate.toISOString().slice(0, 10),
      e.category,
      e.vendor ?? "",
      e.amount.toString(),
      e.paymentMethod ?? "",
      e.description ?? "",
    ]),
  );
  return csvResponse(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
