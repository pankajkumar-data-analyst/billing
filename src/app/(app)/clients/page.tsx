import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { clientScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const user = await requirePermission(PERMISSIONS.CLIENT_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.CLIENT_MANAGE);

  const q = searchParams.q?.trim();
  const status = searchParams.status;

  const clients = await prisma.client.findMany({
    where: {
      AND: [
        clientScope(user), // recruiters: only clients with a job assigned to them
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        status ? { status: status as "ACTIVE" | "INACTIVE" | "PROSPECT" } : {},
      ],
    },
    include: { _count: { select: { jobs: true, placements: true, invoices: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Companies you recruit for and their commercial terms."
        action={
          canManage ? (
            <Link href="/clients/new" className={buttonVariants({ variant: "gold" })}>
              <Plus className="h-4 w-4" /> New Client
            </Link>
          ) : null
        }
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by company name…"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PROSPECT">Prospect</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button className={buttonVariants({ variant: "outline" })}>Filter</button>
      </form>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Company</TH>
              <TH>City</TH>
              <TH>Status</TH>
              <TH>Jobs</TH>
              <TH>Placements</TH>
              <TH>Invoices</TH>
            </TR>
          </THead>
          <TBody>
            {clients.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-10 text-center text-muted-foreground">
                  No clients found.
                </TD>
              </TR>
            ) : (
              clients.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/clients/${c.id}`} className="font-medium text-navy hover:underline">
                      {c.name}
                    </Link>
                    {c.industry ? <p className="text-xs text-muted-foreground">{c.industry}</p> : null}
                  </TD>
                  <TD>{c.city ?? "—"}</TD>
                  <TD><Badge tone={statusTone(c.status)}>{c.status}</Badge></TD>
                  <TD>{c._count.jobs}</TD>
                  <TD>{c._count.placements}</TD>
                  <TD>{c._count.invoices}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
