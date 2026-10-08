import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatINR, sum } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await requirePermission(PERMISSIONS.PAYMENT_VIEW);
  const payments = await prisma.payment.findMany({
    include: { invoice: true, client: true, recordedBy: { include: { employee: true } } },
    orderBy: { paymentDate: "desc" },
    take: 200,
  });
  const totalReceived = sum(payments.filter((p) => !p.isReversed).map((p) => p.amount));

  return (
    <div>
      <PageHeader
        title="Payments / Receivables"
        subtitle={`Total received: ${formatINR(totalReceived)}`}
        action={hasPermission(user, PERMISSIONS.REPORT_EXPORT_FINANCIAL) ? <Link href="/api/export/payments" className={buttonVariants({ variant: "outline" })}>Export CSV</Link> : null}
      />
      <Card>
        <Table>
          <THead>
            <TR><TH>Date</TH><TH>Client</TH><TH>Invoice</TH><TH>Amount</TH><TH>Mode</TH><TH>Reference</TH><TH>Recorded By</TH></TR>
          </THead>
          <TBody>
            {payments.length === 0 ? (
              <TR><TD colSpan={7} className="py-10 text-center text-muted-foreground">No payments recorded.</TD></TR>
            ) : (
              payments.map((p) => (
                <TR key={p.id}>
                  <TD>{formatDate(p.paymentDate)}</TD>
                  <TD>{p.client.name}</TD>
                  <TD><Link href={`/invoices/${p.invoiceId}`} className="text-navy hover:underline">{p.invoice.number}</Link></TD>
                  <TD className={p.isReversed ? "text-muted-foreground line-through" : "font-medium"}>{formatINR(p.amount)}</TD>
                  <TD>{titleCase(p.mode)}</TD>
                  <TD>{p.reference ?? "—"}</TD>
                  <TD>{p.recordedBy.employee?.name ?? p.recordedBy.email}{p.isReversed ? <Badge tone="danger" className="ml-2">Reversed</Badge> : null}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
