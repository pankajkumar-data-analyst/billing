import Link from "next/link";
import { requireUser, hasPermission } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { jobScope } from "@/lib/scope";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.JOB_VIEW) && !hasPermission(user, PERMISSIONS.JOB_VIEW_ASSIGNED)) redirect("/403");
  const canManage = hasPermission(user, PERMISSIONS.JOB_MANAGE);

  const q = searchParams.q?.trim();
  const status = searchParams.status;

  const jobs = await prisma.job.findMany({
    where: {
      AND: [
        jobScope(user),
        q ? { title: { contains: q, mode: "insensitive" } } : {},
        status ? { status: status as never } : {},
      ],
    },
    include: { client: true, recruiter: true, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Jobs / Requirements"
        subtitle="Open recruitment requirements and their pipelines."
        action={canManage ? <Link href="/jobs/new" className={buttonVariants({ variant: "gold" })}><Plus className="h-4 w-4" /> New Job</Link> : null}
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search job title…" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {["NEW", "ACTIVE", "ON_HOLD", "INTERVIEWING", "FILLED", "CLOSED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{titleCase(s)}</option>
          ))}
        </select>
        <button className={buttonVariants({ variant: "outline" })}>Filter</button>
      </form>

      <Card>
        <Table>
          <THead>
            <TR><TH>Title</TH><TH>Client</TH><TH>Recruiter</TH><TH>Openings</TH><TH>Pipeline</TH><TH>Status</TH></TR>
          </THead>
          <TBody>
            {jobs.length === 0 ? (
              <TR><TD colSpan={6} className="py-10 text-center text-muted-foreground">No jobs found.</TD></TR>
            ) : (
              jobs.map((j) => (
                <TR key={j.id}>
                  <TD><Link href={`/jobs/${j.id}`} className="font-medium text-navy hover:underline">{j.title}</Link>
                    {j.location ? <p className="text-xs text-muted-foreground">{j.location}</p> : null}</TD>
                  <TD>{j.client.name}</TD>
                  <TD>{j.recruiter?.name ?? "—"}</TD>
                  <TD>{j.openings}</TD>
                  <TD>{j._count.applications}</TD>
                  <TD><Badge tone={statusTone(j.status)}>{titleCase(j.status)}</Badge></TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
