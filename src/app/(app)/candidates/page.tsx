import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { candidateScope } from "@/lib/scope";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await requirePermission(PERMISSIONS.CANDIDATE_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.CANDIDATE_MANAGE);
  const q = searchParams.q?.trim();

  const candidates = await prisma.candidate.findMany({
    where: {
      AND: [
        candidateScope(user),
        q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { mobile: { contains: q } },
                { email: { contains: q, mode: "insensitive" } },
                { skills: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    include: { recruiter: true, _count: { select: { applications: true, placements: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Candidates"
        subtitle="One record per person - reused across jobs."
        action={canManage ? <Link href="/candidates/new" className={buttonVariants({ variant: "gold" })}><Plus className="h-4 w-4" /> New Candidate</Link> : null}
      />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, mobile, email, skills…" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <button className={buttonVariants({ variant: "outline" })}>Search</button>
      </form>
      <Card>
        <Table>
          <THead>
            <TR><TH>Name</TH><TH>Current Company</TH><TH>Exp</TH><TH>Expected CTC</TH><TH>Applications</TH><TH>Recruiter</TH></TR>
          </THead>
          <TBody>
            {candidates.length === 0 ? (
              <TR><TD colSpan={6} className="py-10 text-center text-muted-foreground">No candidates found.</TD></TR>
            ) : (
              candidates.map((c) => (
                <TR key={c.id}>
                  <TD><Link href={`/candidates/${c.id}`} className="font-medium text-navy hover:underline">{c.fullName}</Link>
                    {c.mobile ? <p className="text-xs text-muted-foreground">{c.mobile}</p> : null}</TD>
                  <TD>{c.currentCompany ?? "-"}</TD>
                  <TD>{c.totalExperience ? `${c.totalExperience} yr` : "-"}</TD>
                  <TD>{c.expectedCtc ? formatINR(c.expectedCtc) : "-"}</TD>
                  <TD>{c._count.applications}</TD>
                  <TD>{c.recruiter?.name ?? "-"}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
