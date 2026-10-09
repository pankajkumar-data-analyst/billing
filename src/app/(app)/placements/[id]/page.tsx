import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { placementScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { guaranteeState } from "@/lib/services/guarantee";
import { titleCase, feeTypeLabel } from "@/lib/labels";
import { ReplacementButton } from "./replacement-button";

export const dynamic = "force-dynamic";

export default async function PlacementDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.PLACEMENT_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.PLACEMENT_MANAGE);
  const canInvoice = hasPermission(user, PERMISSIONS.INVOICE_CREATE);
  const canSeeMoney = hasPermission(user, PERMISSIONS.INVOICE_VIEW);

  // Scoped: a recruiter can only open their own placement.
  const p = await prisma.placement.findFirst({
    where: { AND: [{ id: params.id }, placementScope(user)] },
    include: { candidate: true, client: true, job: true, invoice: true },
  });
  if (!p) notFound();

  const gstate = guaranteeState(p.guaranteeEnd);

  return (
    <div>
      <PageHeader
        title={`Placement — ${p.candidate.fullName}`}
        subtitle={`${p.job.title} @ ${p.client.name}`}
        action={
          <div className="flex gap-2">
            {canInvoice && !p.invoice ? (
              <Link href={`/invoices/new?placementId=${p.id}`} className={buttonVariants({ variant: "gold" })}>
                Generate Invoice
              </Link>
            ) : null}
            {p.invoice ? (
              <Link href={`/invoices/${p.invoice.id}`} className={buttonVariants({ variant: "outline" })}>
                View Invoice {p.invoice.number}
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Candidate" value={<Link href={`/candidates/${p.candidateId}`} className="text-navy hover:underline">{p.candidate.fullName}</Link>} />
            <Row label="Client" value={<Link href={`/clients/${p.clientId}`} className="text-navy hover:underline">{p.client.name}</Link>} />
            <Row label="Job" value={p.job.title} />
            <Row label="Joining Date" value={formatDate(p.joiningDate)} />
            <Row label="Offered CTC" value={formatINR(p.offeredCtc)} />
            <Row label="Annual CTC" value={formatINR(p.annualCtc)} />
            <Row label="Status" value={<Badge tone={statusTone(p.status)}>{titleCase(p.status)}</Badge>} />
          </CardContent>
        </Card>

        {canSeeMoney ? (
          <Card>
            <CardHeader><CardTitle>Recruitment Fee</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Fee Type" value={feeTypeLabel(p.feeType)} />
              {p.feePercent ? <Row label="Percentage" value={`${p.feePercent}%`} /> : null}
              {p.fixedFee ? <Row label="Fixed Fee" value={formatINR(p.fixedFee)} /> : null}
              <div className="mt-3 rounded-md bg-gold/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Calculated Fee</p>
                <p className="mt-1 text-2xl font-bold text-navy">{formatINR(p.calculatedFee)}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle>Replacement Guarantee</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Start" value={formatDate(p.guaranteeStart)} />
            <Row label="End" value={formatDate(p.guaranteeEnd)} />
            <Row label="Duration" value={`${p.guaranteeDays} days`} />
            <Row label="Status" value={gstate === "NA" ? "—" : <Badge tone={statusTone(gstate)}>{titleCase(gstate)}</Badge>} />
            {canManage && p.status === "JOINED" ? (
              <div className="pt-3"><ReplacementButton placementId={p.id} /></div>
            ) : null}
          </CardContent>
        </Card>

        {p.notes ? (
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.notes}</p></CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
