import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";
import { refreshOverdueInvoices } from "@/lib/services/invoice-refresh";
import { renderInvoiceEmail } from "@/lib/services/email-template";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatINR, subtract } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { RecordPaymentForm } from "./record-payment";
import { MarkSentButton, CancelInvoice, EmailTemplate } from "./invoice-actions";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.INVOICE_VIEW);
  await refreshOverdueInvoices();
  const canManage = hasPermission(user, PERMISSIONS.INVOICE_MANAGE);
  const canPay = hasPermission(user, PERMISSIONS.PAYMENT_MANAGE);

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: { items: true, client: true, payments: { orderBy: { paymentDate: "desc" } } },
    }),
    getSettings(),
  ]);
  if (!invoice) notFound();

  const outstanding = subtract(invoice.total, invoice.amountPaid);
  const item = invoice.items[0];
  const emailBody = renderInvoiceEmail(settings.invoiceEmailTemplate, {
    clientName: invoice.clientNameSnapshot,
    candidateName: item?.candidateName ?? "the candidate",
    jobTitle: item?.jobTitle ?? "the position",
    invoiceNumber: invoice.number,
    amount: formatINR(invoice.total),
    dueDate: formatDate(invoice.dueDate),
  });

  const isCancelled = invoice.status === "CANCELLED";

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.number}`}
        subtitle={invoice.clientNameSnapshot}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/invoices/${invoice.id}/pdf`} target="_blank" className={buttonVariants({ variant: "gold" })}>Download / Print PDF</Link>
            {canManage && invoice.status === "DRAFT" ? <MarkSentButton invoiceId={invoice.id} /> : null}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge tone={statusTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>
        <span className="text-sm text-muted-foreground">Total <strong className="text-navy">{formatINR(invoice.total)}</strong></span>
        <span className="text-sm text-muted-foreground">Paid <strong className="text-green-700">{formatINR(invoice.amountPaid)}</strong></span>
        <span className="text-sm text-muted-foreground">Outstanding <strong className="text-amber-700">{formatINR(outstanding)}</strong></span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* On-screen preview */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-lg font-bold text-navy">{settings.companyName}</p>
                  {settings.address ? <p className="text-xs text-muted-foreground">{settings.address}</p> : null}
                  <p className="text-xs text-muted-foreground">{[settings.phone, settings.email].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="text-2xl font-bold text-gold-dark">INVOICE</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Number</p><p className="font-medium">{invoice.number}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{formatDate(invoice.invoiceDate)}</p></div>
                <div><p className="text-xs text-muted-foreground">Due</p><p className="font-medium">{formatDate(invoice.dueDate)}</p></div>
              </div>
              <div className="mt-4 rounded bg-secondary p-3 text-sm">
                <p className="text-xs text-muted-foreground">Bill To</p>
                <p className="font-semibold">{invoice.clientNameSnapshot}</p>
                {invoice.clientAddressSnapshot ? <p className="text-xs text-muted-foreground">{invoice.clientAddressSnapshot}</p> : null}
              </div>
              <Table>
                <THead><TR><TH>Description</TH><TH>Details</TH><TH>Amount</TH></TR></THead>
                <TBody>
                  {invoice.items.map((it) => (
                    <TR key={it.id}>
                      <TD>{it.description}
                        {it.candidateName ? <p className="text-xs text-muted-foreground">Candidate: {it.candidateName}</p> : null}
                        {it.jobTitle ? <p className="text-xs text-muted-foreground">Position: {it.jobTitle}</p> : null}
                      </TD>
                      <TD>{it.ctc ? `CTC ${formatINR(it.ctc)}` : "—"}</TD>
                      <TD>{formatINR(it.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <div className="mt-3 ml-auto w-56 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(invoice.subtotal)}</span></div>
                {settings.gstEnabled && Number(invoice.taxRate) > 0 ? (
                  <div className="flex justify-between"><span>GST ({invoice.taxRate.toString()}%)</span><span>{formatINR(invoice.taxAmount)}</span></div>
                ) : null}
                <div className="mt-1 flex justify-between border-t pt-1 font-bold text-navy"><span>Total</span><span>{formatINR(invoice.total)}</span></div>
              </div>
              <p className="mt-6 text-center text-xs text-muted-foreground">{settings.invoiceFooter}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Payments */}
          <Card>
            <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              ) : (
                invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                    <div>
                      <p className={p.isReversed ? "font-medium text-muted-foreground line-through" : "font-medium"}>{formatINR(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)} · {p.mode.replace("_", " ")}</p>
                    </div>
                    {p.isReversed ? <Badge tone="danger">Reversed</Badge> : null}
                  </div>
                ))
              )}
              {canPay && !isCancelled && outstanding.greaterThan(0) ? (
                <div className="border-t pt-3">
                  <RecordPaymentForm invoiceId={invoice.id} outstanding={outstanding.toFixed(2)} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Email template */}
          <Card>
            <CardHeader><CardTitle>Invoice Email</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">No email is sent automatically. Copy this text to send manually.</p>
              <EmailTemplate template={emailBody} />
            </CardContent>
          </Card>

          {/* Danger zone */}
          {canManage && !isCancelled ? (
            <Card>
              <CardHeader><CardTitle>Manage</CardTitle></CardHeader>
              <CardContent><CancelInvoice invoiceId={invoice.id} /></CardContent>
            </Card>
          ) : null}
          {isCancelled ? (
            <Card>
              <CardContent className="pt-5 text-sm text-red-700">
                This invoice was cancelled{invoice.cancelReason ? `: ${invoice.cancelReason}` : ""}.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
