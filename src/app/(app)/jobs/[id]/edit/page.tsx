import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { JobForm } from "../../job-form";
import { updateJob } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.JOB_MANAGE);
  const [job, clients, recruiters] = await Promise.all([
    prisma.job.findUnique({ where: { id: params.id } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!job) notFound();

  const defaults = {
    clientId: job.clientId, title: job.title, location: job.location, department: job.department,
    openings: job.openings, salaryMin: job.salaryMin?.toString(), salaryMax: job.salaryMax?.toString(),
    expMin: job.expMin ?? undefined, expMax: job.expMax ?? undefined, employmentType: job.employmentType,
    requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills, jd: job.jd,
    recruiterId: job.recruiterId ?? undefined, priority: job.priority, status: job.status,
  };

  return (
    <div>
      <PageHeader title={`Edit ${job.title}`} />
      <JobForm
        action={updateJob.bind(null, job.id)}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        recruiters={recruiters.map((r) => ({ id: r.id, label: r.name }))}
        defaults={defaults}
        submitLabel="Save Changes"
      />
    </div>
  );
}
