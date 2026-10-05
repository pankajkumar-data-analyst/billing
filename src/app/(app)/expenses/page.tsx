import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatINR, sum } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ExpenseForm } from "./expense-form";
import { createExpense } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const user = await requirePermission(PERMISSIONS.EXPENSE_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.EXPENSE_MANAGE);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expenses = await prisma.expense.findMany({ orderBy: { expenseDate: "desc" }, take: 200 });
  const monthTotal = sum(expenses.filter((e) => e.expenseDate >= monthStart).map((e) => e.amount));

  return (
    <div>
      <PageHeader title="Expenses" subtitle={`This month: ${formatINR(monthTotal)}`} />
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
                      <TD>{e.vendor ?? "—"}</TD>
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
