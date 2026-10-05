import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { PlacementForm, type ApplicationOption } from "../placement-form";
import { createPlacement } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewPlacementPage({ searchParams }: { searchParams: { applicationId?: string } }) {
  await requirePermission(PERMISSIONS.PLACEMENT_MANAGE);

  // Candidates that have reached SELECTED/OFFER/JOINED and have no placement yet.
  const applications = await prisma.candidateApplication.findMany({
    where: { stage: { in: ["SELECTED", "OFFER", "JOINED"] }, placement: null },
    include: { candidate: true, job: { include: { client: { include: { terms: true } } } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const options: ApplicationOption[] = applications.map((a) => ({
    id: a.id,
    label: `${a.candidate.fullName} — ${a.job.title} (${a.job.client.name})`,
    defaultFeeType: a.job.client.terms?.feeType ?? "PERCENT",
    defaultPercent: a.job.client.terms?.percent?.toString() ?? null,
    defaultFixed: a.job.client.terms?.fixedAmount?.toString() ?? null,
    guaranteeDays: a.job.client.terms?.replacementDays ?? 90,
    expectedCtc: a.candidate.expectedCtc?.toString() ?? null,
  }));

  return (
    <div>
      <PageHeader title="New Placement" subtitle="Record a joining and auto-calculate the recruitment fee." />
      {options.length === 0 ? (
        <p className="rounded-md border bg-white p-6 text-sm text-muted-foreground">
          No candidates are ready for placement. Move a candidate to <strong>Selected</strong>, <strong>Offer</strong> or <strong>Joined</strong> in a job pipeline first.
        </p>
      ) : (
        <PlacementForm action={createPlacement} applications={options} preselectedId={searchParams.applicationId} />
      )}
    </div>
  );
}
