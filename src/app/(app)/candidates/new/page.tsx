import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { CandidateForm } from "../candidate-form";
import { createCandidate } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCandidatePage() {
  await requirePermission(PERMISSIONS.CANDIDATE_MANAGE);
  const recruiters = await prisma.employee.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div>
      <PageHeader title="New Candidate" />
      <CandidateForm action={createCandidate} recruiters={recruiters.map((r) => ({ id: r.id, label: r.name }))} submitLabel="Create Candidate" />
    </div>
  );
}
