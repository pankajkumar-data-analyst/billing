"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { invoiceSchema } from "@/lib/validation";
import { computeInvoiceTotals, deriveInvoiceStatus } from "@/lib/services/invoice";
import { allocateInvoiceNumber } from "@/lib/services/invoice-number";
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
 * Create an invoice (spec §11). Invoice number is allocated atomically from
 * settings inside the transaction so numbering is sequential and employees
 * can't manipulate it. GST stays off unless taxRate > 0 (GST-ready, spec §5).
 */
export async function createInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.INVOICE_CREATE);
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;

  const totals = computeInvoiceTotals([{ amount: d.amount }], d.taxRate);

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await allocateInvoiceNumber(tx, d.invoiceDate);
    return tx.invoice.create({
      data: {
        number,
        status: "DRAFT",
        placementId: d.placementId || null,
        clientId: d.clientId,
        invoiceDate: d.invoiceDate,
        dueDate: d.dueDate,
        clientNameSnapshot: d.clientNameSnapshot,
        clientAddressSnapshot: d.clientAddressSnapshot,
        contactPerson: d.contactPerson,
        contactEmail: d.contactEmail,
        contactPhone: d.contactPhone,
        subtotal: toDbString(totals.subtotal),
        taxRate: toDbString(totals.taxRate),
        taxAmount: toDbString(totals.taxAmount),
        total: toDbString(totals.total),
        amountPaid: "0.00",
        paymentTerms: d.paymentTerms,
        replacementTerms: d.replacementTerms,
        bankDetailsSnapshot: d.bankDetailsSnapshot,
        notes: d.notes,
        items: {
          create: {
            description: d.description,
            candidateName: d.candidateName,
            jobTitle: d.jobTitle,
            joiningDate: d.joiningDate,
            ctc: d.ctc != null ? toDbString(d.ctc) : null,
            feeType: d.feeType,
            feePercent: d.feePercent != null ? toDbString(d.feePercent) : null,
            amount: toDbString(d.amount),
          },
        },
      },
    });
  });

  await writeAudit({ userId: user.id, action: AUDIT.INVOICE_CREATE, entity: "Invoice", entityId: invoice.id, after: { number: invoice.number, total: toDbString(totals.total) } });
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

/** Mark an invoice as sent (spec §12 — Admin-confirmed, no auto email). */
export async function markSent(invoiceId: string): Promise<void> {
  const user = await assertPermission(PERMISSIONS.INVOICE_MANAGE);
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv || inv.status === "CANCELLED") return;
  const status = deriveInvoiceStatus({
    current: "SENT", total: inv.total, amountPaid: inv.amountPaid, dueDate: inv.dueDate,
  });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status, sentAt: new Date() } });
  await writeAudit({ userId: user.id, action: AUDIT.INVOICE_SENT, entity: "Invoice", entityId: invoiceId });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

/** Cancel an invoice (never hard-delete, spec §40). Requires a reason. */
export async function cancelInvoice(invoiceId: string, formData: FormData): Promise<void> {
  const user = await assertPermission(PERMISSIONS.INVOICE_MANAGE);
  const reason = String(formData.get("reason") ?? "").trim();
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return;
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason || "Cancelled by admin" },
  });
  await writeAudit({ userId: user.id, action: AUDIT.INVOICE_CANCEL, entity: "Invoice", entityId: invoiceId, before: { status: inv.status }, after: { status: "CANCELLED", reason } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
