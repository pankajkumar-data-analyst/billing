import { requirePermission, hasPermission } from "@/lib/auth/guards";
import Link from "next/link";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { StatusPie, RevenueTrendChart } from "@/components/app/charts";
import { formatINR, sum, toDecimal } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ExpenseForm } from "./expense-form";
import { createExpense } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const user = await requirePermission(PERMISSIONS.EXPENSE_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.EXPENSE_MANAGE);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const expenses = await prisma.expense.findMany({ orderBy: { expenseDate: "desc" }, take: 500 });
  const monthTotal = sum(expenses.filter((e) => e.expenseDate >= monthStart).map((e) => e.amount));
  const yearTotal = sum(expenses.filter((e) => e.expenseDate >= yearStart).map((e) => e.amount));

  // Category breakdown (this year).
  const byCategory = new Map<string, number>();
  for (const e of expenses.filter((x) => x.expenseDate >= yearStart)) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + toDecimal(e.amount).toNumber());
  }
  const categoryData = [...byCategory.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  // Last 6 months trend.
  const trend: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nxt = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const v = sum(expenses.filter((e) => e.expenseDate >= d && e.expenseDate < nxt).map((e) => e.amount));
    trend.push({ label: d.toLocaleString("en-IN", { month: "short" }), value: v.toNumber() });
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`This month: ${formatINR(monthTotal)}  ·  This year: ${formatINR(yearTotal)}`}
        action={canManage ? <Link href="/api/export/expenses" className={buttonVariants({ variant: "outline" })}>Export CSV</Link> : null}
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By Category (this year)</CardTitle></CardHeader>
          <CardContent><StatusPie data={categoryData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
          <CardContent><RevenueTrendChart data={trend} /></CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <Table>
              <THead><TR><TH>Date</TH><TH>Category</TH><TH>Vendor</TH><TH>Amount</TH></TR></THead>
              <TBody>
                {expenses.length === 0 ? (
                  <TR><TD colSpan={4} className="py-10 text-center text-muted-foreground">No expenses.</TD></TR>
                ) : (
                  expenses.map((e) => (
                    <TR key={e.id}>
                      <TD>{formatDate(e.expenseDate)}</TD>
                      <TD>{e.category}</TD>
                      <TD>{e.vendor ?? "-"}</TD>
                      <TD className="font-medium">{formatINR(e.amount)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </div>
        {canManage ? (
          <Card>
            <CardHeader><CardTitle>Add Expense</CardTitle></CardHeader>
            <CardContent><ExpenseForm action={createExpense} /></CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
