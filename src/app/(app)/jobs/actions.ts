"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { jobSchema } from "@/lib/validation";
import { toDbString } from "@/lib/money";
import { z } from "zod";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

function flatten(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) if (!out[i.path.join(".")]) out[i.path.join(".")] = i.message;
  return out;
}

function mapData(d: z.infer<typeof jobSchema>) {
  return {
    clientId: d.clientId,
    title: d.title,
    location: d.location,
    department: d.department,
    openings: d.openings,
    salaryMin: d.salaryMin != null ? toDbString(d.salaryMin) : null,
    salaryMax: d.salaryMax != null ? toDbString(d.salaryMax) : null,
    expMin: d.expMin,
    expMax: d.expMax,
    employmentType: d.employmentType,
    requiredSkills: d.requiredSkills,
    preferredSkills: d.preferredSkills,
    jd: d.jd,
    recruiterId: d.recruiterId || null,
    priority: d.priority,
    status: d.status,
  };
}

export async function createJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertPermission(PERMISSIONS.JOB_MANAGE);
  const parsed = jobSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  const job = await prisma.job.create({ data: mapData(parsed.data) });
  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertPermission(PERMISSIONS.JOB_MANAGE);
  const parsed = jobSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  await prisma.job.update({ where: { id }, data: mapData(parsed.data) });
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  redirect(`/jobs/${id}`);
}
