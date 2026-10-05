import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.CANDIDATE_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.CANDIDATE_MANAGE);

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      recruiter: true,
      applications: { include: { job: { include: { client: true } }, placement: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!candidate) notFound();

  const info: [string, string | null][] = [
    ["Mobile", candidate.mobile],
    ["Email", candidate.email],
    ["Location", candidate.location],
    ["Current Company", candidate.currentCompany],
    ["Current Designation", candidate.currentDesignation],
    ["Experience", candidate.totalExperience ? `${candidate.totalExperience} yrs` : null],
    ["Current CTC", candidate.currentCtc ? formatINR(candidate.currentCtc) : null],
    ["Expected CTC", candidate.expectedCtc ? formatINR(candidate.expectedCtc) : null],
    ["Notice Period", candidate.noticePeriod],
    ["Source", candidate.source],
    ["Recruiter", candidate.recruiter?.name ?? null],
  ];

  return (
    <div>
      <PageHeader
        title={candidate.fullName}
        subtitle={candidate.currentDesignation ?? undefined}
        action={canManage ? <Link href={`/candidates/${candidate.id}/edit`} className={buttonVariants({ variant: "outline" })}>Edit</Link> : null}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {info.filter(([, val]) => val).map(([label, val]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium">{val}</span>
              </div>
            ))}
            {candidate.skills ? (
              <div className="pt-2"><span className="text-muted-foreground">Skills</span><p className="mt-1">{candidate.skills}</p></div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Application History ({candidate.applications.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {candidate.applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not linked to any job yet.</p>
            ) : (
              candidate.applications.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <div>
                    <Link href={`/jobs/${a.jobId}`} className="text-sm font-medium text-navy hover:underline">{a.job.title}</Link>
                    <p className="text-xs text-muted-foreground">{a.job.client.name} · updated {formatDate(a.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(a.stage)}>{titleCase(a.stage)}</Badge>
                    {a.placement ? <Link href={`/placements/${a.placement.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Placement</Link> : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
