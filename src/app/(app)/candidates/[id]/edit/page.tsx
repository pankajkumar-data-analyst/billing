import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { candidateScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { CandidateForm } from "../../candidate-form";
import { updateCandidate } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditCandidatePage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.CANDIDATE_MANAGE);
  const [candidate, recruiters] = await Promise.all([
    // Scoped so a recruiter can't open the edit form for another's candidate.
    prisma.candidate.findFirst({ where: { AND: [{ id: params.id }, candidateScope(user)] } }),
    prisma.employee.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!candidate) notFound();

  const defaults = {
    fullName: candidate.fullName, mobile: candidate.mobile, email: candidate.email, location: candidate.location,
    currentCompany: candidate.currentCompany, currentDesignation: candidate.currentDesignation,
    totalExperience: candidate.totalExperience?.toString(), currentCtc: candidate.currentCtc?.toString(),
    expectedCtc: candidate.expectedCtc?.toString(), noticePeriod: candidate.noticePeriod,
    skills: candidate.skills, source: candidate.source, recruiterId: candidate.recruiterId ?? undefined, notes: candidate.notes,
  };

  return (
    <div>
      <PageHeader title={`Edit ${candidate.fullName}`} />
      <CandidateForm action={updateCandidate.bind(null, candidate.id)} recruiters={recruiters.map((r) => ({ id: r.id, label: r.name }))} defaults={defaults} submitLabel="Save Changes" />
    </div>
  );
}
