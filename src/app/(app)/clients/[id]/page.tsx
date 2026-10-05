import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { sum, subtract } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { feeTypeLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.CLIENT_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.CLIENT_MANAGE);
  const canSeeMoney = hasPermission(user, PERMISSIONS.INVOICE_VIEW);

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      terms: true,
      contacts: true,
      jobs: { orderBy: { createdAt: "desc" }, take: 20 },
      placements: { include: { candidate: true }, orderBy: { joiningDate: "desc" }, take: 20 },
      invoices: { orderBy: { invoiceDate: "desc" }, take: 50 },
    },
  });
  if (!client) notFound();

  const totalBilled = sum(client.invoices.filter((i) => i.status !== "CANCELLED").map((i) => i.total));
  const totalReceived = sum(client.invoices.map((i) => i.amountPaid));
  const outstanding = subtract(totalBilled, totalReceived);

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={[client.industry, client.city].filter(Boolean).join(" · ") || undefined}
        action={
          canManage ? (
            <Link href={`/clients/${client.id}/edit`} className={buttonVariants({ variant: "outline" })}>
              Edit
            </Link>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(client.status)}>{client.status}</Badge>
        {client.terms ? (
          <Badge tone="gold">
            {feeTypeLabel(client.terms.feeType)}
            {client.terms.feeType === "PERCENT" && client.terms.percent ? ` ${client.terms.percent}%` : ""}
            {client.terms.feeType === "FIXED" && client.terms.fixedAmount ? ` ${formatINR(client.terms.fixedAmount)}` : ""}
          </Badge>
        ) : null}
        {client.terms ? <Badge>Payment: {client.terms.paymentDueDays}d</Badge> : null}
        {client.terms ? <Badge>Replacement: {client.terms.replacementDays}d</Badge> : null}
      </div>

      {canSeeMoney ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Billed" value={formatINR(totalBilled)} />
          <StatCard label="Total Received" value={formatINR(totalReceived)} tone="success" />
          <StatCard label="Outstanding" value={formatINR(outstanding)} tone={outstanding.isZero() ? "default" : "warning"} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Open Jobs ({client.jobs.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {client.jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              client.jobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <Link href={`/jobs/${j.id}`} className="text-sm font-medium text-navy hover:underline">
                    {j.title}
                  </Link>
                  <Badge tone={statusTone(j.status)}>{j.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Placements ({client.placements.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {client.placements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No placements yet.</p>
            ) : (
              client.placements.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <div>
                    <Link href={`/placements/${p.id}`} className="text-sm font-medium text-navy hover:underline">
                      {p.candidate.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">Joined {formatDate(p.joiningDate)}</p>
                  </div>
                  {canSeeMoney ? <span className="text-sm font-medium">{formatINR(p.calculatedFee)}</span> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {canSeeMoney ? (
        <Card className="mt-6">
          <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Number</TH><TH>Date</TH><TH>Due</TH><TH>Total</TH><TH>Paid</TH><TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {client.invoices.length === 0 ? (
                  <TR><TD colSpan={6} className="py-6 text-center text-muted-foreground">No invoices.</TD></TR>
                ) : (
                  client.invoices.map((inv) => (
                    <TR key={inv.id}>
                      <TD><Link href={`/invoices/${inv.id}`} className="font-medium text-navy hover:underline">{inv.number}</Link></TD>
                      <TD>{formatDate(inv.invoiceDate)}</TD>
                      <TD>{formatDate(inv.dueDate)}</TD>
                      <TD>{formatINR(inv.total)}</TD>
                      <TD>{formatINR(inv.amountPaid)}</TD>
                      <TD><Badge tone={statusTone(inv.status)}>{inv.status.replace("_", " ")}</Badge></TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" }) {
  const color = tone === "success" ? "text-green-700" : tone === "warning" ? "text-amber-700" : "text-navy";
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
