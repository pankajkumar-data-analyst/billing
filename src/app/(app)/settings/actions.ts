"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { toDbString } from "@/lib/money";
import { z } from "zod";

type ActionState = { error?: string; ok?: boolean };

const schema = z.object({
  companyName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  upiId: z.string().optional(),
  invoicePrefix: z.string().min(1),
  nextInvoiceSeq: z.coerce.number().int().min(1),
  invoiceSeqPadding: z.coerce.number().int().min(1).max(10),
  gstEnabled: z.string().optional(),
  gstRate: z.coerce.number().min(0).max(100),
  defaultPaymentDays: z.coerce.number().int().min(0),
  defaultReplacementDays: z.coerce.number().int().min(0),
  defaultFeePercent: z.coerce.number().min(0),
  invoiceFooter: z.string().optional(),
  invoiceEmailTemplate: z.string().optional(),
  officeStartTime: z.string(),
  officeEndTime: z.string(),
  graceMinutes: z.coerce.number().int().min(0),
  halfDayHours: z.coerce.number().min(0),
  fullDayHours: z.coerce.number().min(0),
  weeklyOff: z.string().optional(),
  leaveQuotaCasual: z.coerce.number().min(0).default(12),
  leaveQuotaSick: z.coerce.number().min(0).default(6),
  leaveQuotaPaid: z.coerce.number().min(0).default(12),
});

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertPermission(PERMISSIONS.SETTINGS_MANAGE);
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  await getSettings(); // ensure row exists
  await prisma.companySettings.update({
    where: { id: "singleton" },
    data: {
      companyName: d.companyName, address: d.address, phone: d.phone, email: d.email, website: d.website,
      gstin: d.gstin, pan: d.pan, bankName: d.bankName, bankAccount: d.bankAccount, bankIfsc: d.bankIfsc, upiId: d.upiId,
      invoicePrefix: d.invoicePrefix, nextInvoiceSeq: d.nextInvoiceSeq, invoiceSeqPadding: d.invoiceSeqPadding,
      gstEnabled: d.gstEnabled === "on", gstRate: toDbString(d.gstRate),
      defaultPaymentDays: d.defaultPaymentDays, defaultReplacementDays: d.defaultReplacementDays,
      defaultFeePercent: toDbString(d.defaultFeePercent),
      invoiceFooter: d.invoiceFooter, invoiceEmailTemplate: d.invoiceEmailTemplate,
      officeStartTime: d.officeStartTime, officeEndTime: d.officeEndTime, graceMinutes: d.graceMinutes,
      halfDayHours: toDbString(d.halfDayHours), fullDayHours: toDbString(d.fullDayHours),
      weeklyOff: d.weeklyOff || "Sun",
      leaveQuotaCasual: toDbString(d.leaveQuotaCasual),
      leaveQuotaSick: toDbString(d.leaveQuotaSick),
      leaveQuotaPaid: toDbString(d.leaveQuotaPaid),
    },
  });

  await writeAudit({ userId: admin.id, action: AUDIT.SETTINGS_UPDATE, entity: "CompanySettings" });
  revalidatePath("/settings");
  return { ok: true };
}
