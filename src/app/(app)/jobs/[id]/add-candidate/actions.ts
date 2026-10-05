"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { candidateSchema } from "@/lib/validation";
import { toDbString } from "@/lib/money";
import { z } from "zod";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

/**
 * Attach a candidate to a job. Two modes:
 *  - existingCandidateId: link an existing candidate (no duplication, spec §8)
 *  - otherwise: create a new candidate record then link it.
 * Either way a CandidateApplication is created at stage SOURCED.
 */
export async function addCandidateToJob(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.CANDIDATE_MANAGE);

  const existingCandidateId = String(formData.get("existingCandidateId") ?? "").trim();

  let candidateId = existingCandidateId;

  if (!candidateId) {
    const parsed = candidateSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) if (!fe[i.path.join(".")]) fe[i.path.join(".")] = i.message;
      return { error: "Please provide a valid candidate.", fieldErrors: fe };
    }
    const d = parsed.data;
    const created = await prisma.candidate.create({
      data: {
        fullName: d.fullName, mobile: d.mobile, email: d.email, location: d.location,
        currentCompany: d.currentCompany, currentDesignation: d.currentDesignation,
        totalExperience: d.totalExperience != null ? d.totalExperience.toString() : null,
        currentCtc: d.currentCtc != null ? toDbString(d.currentCtc) : null,
        expectedCtc: d.expectedCtc != null ? toDbString(d.expectedCtc) : null,
        noticePeriod: d.noticePeriod, skills: d.skills, source: d.source,
        recruiterId: d.recruiterId || user.employeeId || null, notes: d.notes,
      },
    });
    candidateId = created.id;
  }

  // Prevent duplicate application for the same candidate+job.
  const existing = await prisma.candidateApplication.findUnique({
    where: { candidateId_jobId: { candidateId, jobId } },
  });
  if (existing) {
    revalidatePath(`/jobs/${jobId}`);
    redirect(`/jobs/${jobId}`);
  }

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { recruiterId: true } });
  await prisma.candidateApplication.create({
    data: { candidateId, jobId, stage: "SOURCED", recruiterId: job?.recruiterId ?? user.employeeId ?? null },
  });

  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}

const searchSchema = z.object({ q: z.string().optional() });

export async function searchCandidates(q: string) {
  await assertPermission(PERMISSIONS.CANDIDATE_VIEW);
  const parsed = searchSchema.safeParse({ q });
  const query = parsed.success ? parsed.data.q?.trim() : "";
  if (!query) return [];
  return prisma.candidate.findMany({
    where: {
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { mobile: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, mobile: true, currentCompany: true },
    take: 10,
  });
}
