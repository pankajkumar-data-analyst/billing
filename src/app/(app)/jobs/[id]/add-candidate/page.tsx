import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { AddCandidateForm } from "./add-candidate-form";
import { addCandidateToJob } from "./actions";

export const dynamic = "force-dynamic";

export default async function AddCandidatePage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.CANDIDATE_MANAGE);
  const [job, candidates, recruiters] = await Promise.all([
    prisma.job.findUnique({ where: { id: params.id }, include: { client: true } }),
    prisma.candidate.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, fullName: true, mobile: true, currentCompany: true } }),
    prisma.employee.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!job) notFound();

  return (
    <div>
      <PageHeader title="Add Candidate" subtitle={`${job.title} - ${job.client.name}`} />
      <AddCandidateForm
        action={addCandidateToJob.bind(null, job.id)}
        candidates={candidates}
        recruiters={recruiters.map((r) => ({ id: r.id, label: r.name }))}
      />
    </div>
  );
}
