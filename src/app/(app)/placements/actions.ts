"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { placementSchema } from "@/lib/validation";
import { calculateRecruitmentFee, type Tier } from "@/lib/services/recruitment-fee";
import { computeGuarantee } from "@/lib/services/guarantee";
import { toDbString } from "@/lib/money";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { z } from "zod";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

function flatten(err: z.ZodError) {
  const o: Record<string, string> = {};
  for (const i of err.issues) if (!o[i.path.join(".")]) o[i.path.join(".")] = i.message;
  return o;
}

/**
 * Create a placement from a candidate application. Fee is computed by the
 * centralized service (single source of truth) and the replacement guarantee
 * window is derived from joining date + guarantee days.
 */
export async function createPlacement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.PLACEMENT_MANAGE);
  const parsed = placementSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;

  const application = await prisma.candidateApplication.findUnique({
    where: { id: d.applicationId },
    include: { candidate: true, job: { include: { client: { include: { terms: true } } } }, placement: true },
  });
  if (!application) return { error: "Application not found." };
  if (application.placement) return { error: "A placement already exists for this application." };

  const terms = application.job.client.terms;
  const fee = calculateRecruitmentFee({
    feeType: d.feeType,
    annualCtc: d.annualCtc,
    percent: d.feePercent ?? terms?.percent ?? undefined,
    fixedAmount: d.fixedFee ?? terms?.fixedAmount ?? undefined,
    customAmount: d.customFee,
    tiers: (terms?.tiers as Tier[] | null) ?? undefined,
  });

  const guarantee = computeGuarantee(d.joiningDate, d.guaranteeDays);

  const placement = await prisma.$transaction(async (tx) => {
    const p = await tx.placement.create({
      data: {
        candidateId: application.candidateId,
        clientId: application.job.clientId,
        jobId: application.jobId,
        applicationId: application.id,
        joiningDate: d.joiningDate,
        offeredCtc: toDbString(d.offeredCtc),
        annualCtc: toDbString(d.annualCtc),
        feeType: d.feeType,
        feePercent: d.feePercent != null ? toDbString(d.feePercent) : terms?.percent ?? null,
        fixedFee: d.fixedFee != null ? toDbString(d.fixedFee) : terms?.fixedAmount ?? null,
        calculatedFee: toDbString(fee.amount),
        guaranteeStart: guarantee.start,
        guaranteeEnd: guarantee.end,
        guaranteeDays: d.guaranteeDays,
        replacementStatus: "WITHIN_GUARANTEE",
        status: "JOINED",
        notes: d.notes,
      },
    });
    // Reflect JOINED on the application + mark job filled.
    await tx.candidateApplication.update({ where: { id: application.id }, data: { stage: "JOINED" } });
    await tx.job.update({ where: { id: application.jobId }, data: { status: "FILLED" } });
    return p;
  });

  await writeAudit({ userId: user.id, action: AUDIT.PLACEMENT_CREATE, entity: "Placement", entityId: placement.id, after: { fee: toDbString(fee.amount), candidate: application.candidate.fullName } });
  revalidatePath("/placements");
  redirect(`/placements/${placement.id}`);
}

/** Flag a placement for replacement within the guarantee window (spec §24). */
export async function markReplacementRequired(placementId: string): Promise<void> {
  const user = await assertPermission(PERMISSIONS.PLACEMENT_MANAGE);
  const before = await prisma.placement.findUnique({ where: { id: placementId } });
  if (!before) return;
  await prisma.placement.update({
    where: { id: placementId },
    data: { status: "REPLACEMENT_REQUIRED", replacementStatus: "REPLACEMENT_REQUESTED" },
  });
  await writeAudit({ userId: user.id, action: AUDIT.PLACEMENT_UPDATE, entity: "Placement", entityId: placementId, before: { status: before.status }, after: { status: "REPLACEMENT_REQUIRED" } });
  revalidatePath(`/placements/${placementId}`);
  revalidatePath("/placements");
}
