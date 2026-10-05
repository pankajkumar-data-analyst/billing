"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { z } from "zod";

const schema = z.object({
  applicationId: z.string().min(1),
  stage: z.enum([
    "SOURCED", "SCREENED", "SHORTLISTED", "SUBMITTED", "INTERVIEW", "SELECTED",
    "OFFER", "JOINED", "REJECTED", "DROPPED", "REPLACEMENT_REQUIRED", "REPLACED",
  ]),
});

/** Move a candidate application to a new pipeline stage. */
export async function changeStage(formData: FormData): Promise<void> {
  await assertPermission(PERMISSIONS.CANDIDATE_MANAGE);
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const { applicationId, stage } = parsed.data;

  const app = await prisma.candidateApplication.update({
    where: { id: applicationId },
    data: { stage },
    include: { job: true },
  });

  // Keep the job status roughly in sync for convenience (non-destructive).
  if (stage === "JOINED" && app.job.status !== "FILLED") {
    await prisma.job.update({ where: { id: app.jobId }, data: { status: "FILLED" } });
  }

  revalidatePath(`/jobs/${app.jobId}`);
  revalidatePath(`/candidates/${app.candidateId}`);
}
