import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { JobForm } from "../job-form";
import { createJob } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  await requirePermission(PERMISSIONS.JOB_MANAGE);
  const [clients, recruiters] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <PageHeader title="New Job" subtitle="Create a recruitment requirement." />
      <JobForm
        action={createJob}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        recruiters={recruiters.map((r) => ({ id: r.id, label: r.name }))}
        submitLabel="Create Job"
      />
    </div>
  );
}
