import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { jobScope } from "@/lib/scope";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { titleCase } from "@/lib/labels";
import { StageControl } from "./stage-control";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!hasPermission(user, PERMISSIONS.JOB_VIEW) && !hasPermission(user, PERMISSIONS.JOB_VIEW_ASSIGNED)) redirect("/403");

  // Scoped fetch: a recruiter can only open a job assigned to them.
  const job = await prisma.job.findFirst({
    where: { AND: [{ id: params.id }, jobScope(user)] },
    include: {
      client: true,
      recruiter: true,
      applications: { include: { candidate: true, placement: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!job) notFound();

  const canManagePipeline = hasPermission(user, PERMISSIONS.CANDIDATE_MANAGE);
  const canManageJob = hasPermission(user, PERMISSIONS.JOB_MANAGE);

  return (
    <div>
      <PageHeader
        title={job.title}
        subtitle={`${job.client.name}${job.location ? " · " + job.location : ""}`}
        action={canManageJob ? <Link href={`/jobs/${job.id}/edit`} className={buttonVariants({ variant: "outline" })}>Edit</Link> : null}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone={statusTone(job.status)}>{titleCase(job.status)}</Badge>
        <Badge tone={statusTone(job.priority)}>{titleCase(job.priority)}</Badge>
        <Badge>Openings: {job.openings}</Badge>
        {job.salaryMin && job.salaryMax ? <Badge>{formatINR(job.salaryMin)}–{formatINR(job.salaryMax)}</Badge> : null}
        {job.recruiter ? <Badge tone="gold">Recruiter: {job.recruiter.name}</Badge> : null}
      </div>

      {job.jd ? (
        <Card className="mb-6">
          <CardHeader><CardTitle>Job Description</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.jd}</p></CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Pipeline ({job.applications.length})</CardTitle>
          {canManagePipeline ? (
            <Link href={`/jobs/${job.id}/add-candidate`} className={buttonVariants({ variant: "gold", size: "sm" })}>
              Add Candidate
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {job.applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates in the pipeline yet.</p>
          ) : (
            job.applications.map((app) => (
              <div key={app.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/candidates/${app.candidate.id}`} className="font-medium text-navy hover:underline">
                    {app.candidate.fullName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {app.candidate.currentDesignation ?? "—"}
                    {app.candidate.totalExperience ? ` · ${app.candidate.totalExperience} yrs` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(app.stage)}>{titleCase(app.stage)}</Badge>
                  {canManagePipeline ? (
                    <StageControl
                      applicationId={app.id}
                      current={app.stage}
                      hasPlacement={!!app.placement}
                      placementId={app.placement?.id}
                    />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
