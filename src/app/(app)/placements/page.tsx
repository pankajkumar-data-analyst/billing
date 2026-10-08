import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { guaranteeState } from "@/lib/services/guarantee";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function PlacementsPage() {
  const user = await requirePermission(PERMISSIONS.PLACEMENT_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.PLACEMENT_MANAGE);
  const canSeeMoney = hasPermission(user, PERMISSIONS.INVOICE_VIEW);

  const placements = await prisma.placement.findMany({
    include: { candidate: true, client: true, job: true, invoice: true },
    orderBy: { joiningDate: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Placements"
        subtitle="Successful joinings — the link between recruitment and billing."
        action={
          <div className="flex gap-2">
            {hasPermission(user, PERMISSIONS.REPORT_EXPORT_FINANCIAL) ? (
              <Link href="/api/export/placements" className={buttonVariants({ variant: "outline" })}>Export CSV</Link>
            ) : null}
            {canManage ? <Link href="/placements/new" className={buttonVariants({ variant: "gold" })}><Plus className="h-4 w-4" /> New Placement</Link> : null}
          </div>
        }
      />
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Candidate</TH><TH>Client</TH><TH>Joining</TH>
              {canSeeMoney ? <TH>Fee</TH> : null}
              <TH>Guarantee</TH><TH>Invoice</TH><TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {placements.length === 0 ? (
              <TR><TD colSpan={canSeeMoney ? 7 : 6} className="py-10 text-center text-muted-foreground">No placements yet.</TD></TR>
            ) : (
              placements.map((p) => {
                const gstate = guaranteeState(p.guaranteeEnd);
                return (
                  <TR key={p.id}>
                    <TD><Link href={`/placements/${p.id}`} className="font-medium text-navy hover:underline">{p.candidate.fullName}</Link>
                      <p className="text-xs text-muted-foreground">{p.job.title}</p></TD>
                    <TD>{p.client.name}</TD>
                    <TD>{formatDate(p.joiningDate)}</TD>
                    {canSeeMoney ? <TD>{formatINR(p.calculatedFee)}</TD> : null}
                    <TD>{gstate === "NA" ? "—" : <Badge tone={statusTone(gstate)}>{titleCase(gstate)}</Badge>}</TD>
                    <TD>{p.invoice ? <Link href={`/invoices/${p.invoice.id}`} className="text-navy hover:underline">{p.invoice.number}</Link> : <span className="text-muted-foreground">—</span>}</TD>
                    <TD><Badge tone={statusTone(p.status)}>{titleCase(p.status)}</Badge></TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
