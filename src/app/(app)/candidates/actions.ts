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

function flatten(err: z.ZodError) {
  const o: Record<string, string> = {};
  for (const i of err.issues) if (!o[i.path.join(".")]) o[i.path.join(".")] = i.message;
  return o;
}

function mapData(d: z.infer<typeof candidateSchema>, fallbackRecruiter?: string | null) {
  return {
    fullName: d.fullName, mobile: d.mobile, email: d.email, location: d.location,
    currentCompany: d.currentCompany, currentDesignation: d.currentDesignation,
    totalExperience: d.totalExperience != null ? d.totalExperience.toString() : null,
    currentCtc: d.currentCtc != null ? toDbString(d.currentCtc) : null,
    expectedCtc: d.expectedCtc != null ? toDbString(d.expectedCtc) : null,
    noticePeriod: d.noticePeriod, skills: d.skills, source: d.source,
    recruiterId: d.recruiterId || fallbackRecruiter || null, notes: d.notes,
  };
}

export async function createCandidate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.CANDIDATE_MANAGE);
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  const c = await prisma.candidate.create({ data: mapData(parsed.data, user.employeeId) });
  revalidatePath("/candidates");
  redirect(`/candidates/${c.id}`);
}

export async function updateCandidate(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertPermission(PERMISSIONS.CANDIDATE_MANAGE);
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  await prisma.candidate.update({ where: { id }, data: mapData(parsed.data) });
  revalidatePath("/candidates");
  revalidatePath(`/candidates/${id}`);
  redirect(`/candidates/${id}`);
}
