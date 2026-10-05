"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { clientSchema } from "@/lib/validation";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { toDbString } from "@/lib/money";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return clientSchema.safeParse(raw);
}

export async function createClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.CLIENT_MANAGE);
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  }
  const d = parsed.data;

  const client = await prisma.client.create({
    data: {
      name: d.name,
      type: d.type,
      industry: d.industry,
      website: d.website,
      address: d.address,
      city: d.city,
      state: d.state,
      gstin: d.gstin,
      pan: d.pan,
      billingAddress: d.billingAddress,
      agreementStatus: d.agreementStatus,
      notes: d.notes,
      status: d.status,
      contacts: d.contactName
        ? {
            create: {
              name: d.contactName,
              designation: d.contactDesignation,
              email: d.contactEmail,
              phone: d.contactPhone,
              whatsapp: d.contactWhatsapp,
              isPrimary: true,
            },
          }
        : undefined,
      terms: {
        create: {
          feeType: d.feeType,
          percent: d.percent != null ? toDbString(d.percent) : null,
          fixedAmount: d.fixedAmount != null ? toDbString(d.fixedAmount) : null,
          paymentDueDays: d.paymentDueDays,
          replacementDays: d.replacementDays,
          agreementRef: d.agreementRef,
        },
      },
    },
  });

  await writeAudit({ userId: user.id, action: AUDIT.CLIENT_CREATE, entity: "Client", entityId: client.id, after: { name: client.name } });
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.CLIENT_MANAGE);
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  }
  const d = parsed.data;

  const before = await prisma.client.findUnique({ where: { id } });
  if (!before) return { error: "Client not found." };

  await prisma.client.update({
    where: { id },
    data: {
      name: d.name, type: d.type, industry: d.industry, website: d.website,
      address: d.address, city: d.city, state: d.state, gstin: d.gstin, pan: d.pan,
      billingAddress: d.billingAddress, agreementStatus: d.agreementStatus,
      notes: d.notes, status: d.status,
      terms: {
        upsert: {
          create: {
            feeType: d.feeType,
            percent: d.percent != null ? toDbString(d.percent) : null,
            fixedAmount: d.fixedAmount != null ? toDbString(d.fixedAmount) : null,
            paymentDueDays: d.paymentDueDays, replacementDays: d.replacementDays, agreementRef: d.agreementRef,
          },
          update: {
            feeType: d.feeType,
            percent: d.percent != null ? toDbString(d.percent) : null,
            fixedAmount: d.fixedAmount != null ? toDbString(d.fixedAmount) : null,
            paymentDueDays: d.paymentDueDays, replacementDays: d.replacementDays, agreementRef: d.agreementRef,
          },
        },
      },
    },
  });

  await writeAudit({ userId: user.id, action: AUDIT.CLIENT_UPDATE, entity: "Client", entityId: id, before: { name: before.name, status: before.status }, after: { name: d.name, status: d.status } });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

function flatten(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
