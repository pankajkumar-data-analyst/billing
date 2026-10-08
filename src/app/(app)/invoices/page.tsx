import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { refreshOverdueInvoices } from "@/lib/services/invoice-refresh";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { subtract, sum } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await requirePermission(PERMISSIONS.INVOICE_VIEW);
  const canCreate = hasPermission(user, PERMISSIONS.INVOICE_CREATE);
  await refreshOverdueInvoices();

  const status = searchParams.status;
  const invoices = await prisma.invoice.findMany({
    where: status ? { status: status as never } : {},
    include: { client: true },
    orderBy: { invoiceDate: "desc" },
    take: 200,
  });

  const active = invoices.filter((i) => i.status !== "CANCELLED");
  const totalBilled = sum(active.map((i) => i.total));
  const totalPaid = sum(active.map((i) => i.amountPaid));
  const outstanding = subtract(totalBilled, totalPaid);
  const overdue = sum(active.filter((i) => i.status === "OVERDUE").map((i) => subtract(i.total, i.amountPaid)));

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="All recruitment invoices and their payment status."
        action={
          <div className="flex gap-2">
            {hasPermission(user, PERMISSIONS.REPORT_EXPORT_FINANCIAL) ? (
              <Link href="/api/export/invoices" className={buttonVariants({ variant: "outline" })}>Export CSV</Link>
            ) : null}
            {canCreate ? <Link href="/invoices/new" className={buttonVariants({ variant: "gold" })}>New Invoice</Link> : null}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Total Billed" value={formatINR(totalBilled)} />
        <Stat label="Collected" value={formatINR(totalPaid)} tone="success" />
        <Stat label="Outstanding" value={formatINR(outstanding)} tone="warning" />
        <Stat label="Overdue" value={formatINR(overdue)} tone="danger" />
      </div>

      <form className="mb-4 flex gap-2">
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <button className={buttonVariants({ variant: "outline" })}>Filter</button>
      </form>

      <Card>
        <Table>
          <THead>
            <TR><TH>Number</TH><TH>Client</TH><TH>Date</TH><TH>Due</TH><TH>Total</TH><TH>Paid</TH><TH>Outstanding</TH><TH>Status</TH></TR>
          </THead>
          <TBody>
            {invoices.length === 0 ? (
              <TR><TD colSpan={8} className="py-10 text-center text-muted-foreground">No invoices.</TD></TR>
            ) : (
              invoices.map((inv) => (
                <TR key={inv.id}>
                  <TD><Link href={`/invoices/${inv.id}`} className="font-medium text-navy hover:underline">{inv.number}</Link></TD>
                  <TD>{inv.client.name}</TD>
                  <TD>{formatDate(inv.invoiceDate)}</TD>
                  <TD>{formatDate(inv.dueDate)}</TD>
                  <TD>{formatINR(inv.total)}</TD>
                  <TD>{formatINR(inv.amountPaid)}</TD>
                  <TD>{formatINR(subtract(inv.total, inv.amountPaid))}</TD>
                  <TD><Badge tone={statusTone(inv.status)}>{inv.status.replace("_", " ")}</Badge></TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const color = { default: "text-navy", success: "text-green-700", warning: "text-amber-700", danger: "text-red-700" }[tone];
  return (
    <Card><CardContent className="pt-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </CardContent></Card>
  );
}
