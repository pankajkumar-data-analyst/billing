"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { paymentSchema } from "@/lib/validation";
import { deriveInvoiceStatus, outstanding } from "@/lib/services/invoice";
import { add, subtract, toDbString, money } from "@/lib/money";
import { writeAudit, AUDIT } from "@/lib/auth/audit";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

/**
 * Record a payment against an invoice (spec §14). Supports partial payments.
 * Recomputes amountPaid and invoice status atomically. Over-payment is
 * rejected to protect the ledger.
 */
export async function recordPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission(PERMISSIONS.PAYMENT_MANAGE);
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) if (!fe[i.path.join(".")]) fe[i.path.join(".")] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;

  const invoice = await prisma.invoice.findUnique({ where: { id: d.invoiceId } });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "CANCELLED") return { error: "Cannot record payment on a cancelled invoice." };

  const remaining = outstanding(invoice.total, invoice.amountPaid);
  if (money(d.amount).greaterThan(remaining)) {
    return { error: `Amount exceeds outstanding balance (${remaining.toFixed(2)}).` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        amount: toDbString(d.amount),
        paymentDate: d.paymentDate,
        mode: d.mode,
        reference: d.reference,
        notes: d.notes,
        recordedById: user.id,
      },
    });
    const newPaid = add(invoice.amountPaid, d.amount);
    const status = deriveInvoiceStatus({
      current: invoice.status === "DRAFT" ? "SENT" : (invoice.status as never),
      total: invoice.total,
      amountPaid: newPaid,
      dueDate: invoice.dueDate,
    });
    await tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid: toDbString(newPaid), status } });
  });

  await writeAudit({ userId: user.id, action: AUDIT.PAYMENT_RECORD, entity: "Invoice", entityId: invoice.id, after: { amount: toDbString(d.amount), mode: d.mode } });
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  return {};
}

/** Reverse a payment (never hard-delete, spec §40). Admin-confirmed. */
export async function reversePayment(paymentId: string, formData: FormData): Promise<void> {
  const user = await assertPermission(PERMISSIONS.PAYMENT_MANAGE);
  const reason = String(formData.get("reason") ?? "").trim();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { invoice: true } });
  if (!payment || payment.isReversed) return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { isReversed: true, reversedAt: new Date(), reverseReason: reason || "Reversed by admin" } });
    const newPaid = subtract(payment.invoice.amountPaid, payment.amount);
    const safePaid = newPaid.isNegative() ? "0.00" : toDbString(newPaid);
    // After reversing, recompute status from the new paid amount. Use SENT as
    // the base (not CANCELLED) so deriveInvoiceStatus can resolve to
    // PAID/PARTIALLY_PAID/OVERDUE/SENT based on the remaining balance.
    const status = deriveInvoiceStatus({
      current: payment.invoice.status === "CANCELLED" ? "CANCELLED" : "SENT",
      total: payment.invoice.total,
      amountPaid: safePaid,
      dueDate: payment.invoice.dueDate,
    });
    await tx.invoice.update({ where: { id: payment.invoiceId }, data: { amountPaid: safePaid, status } });
  });

  await writeAudit({ userId: user.id, action: AUDIT.PAYMENT_REVERSE, entity: "Payment", entityId: paymentId, after: { reason } });
  revalidatePath(`/invoices/${payment.invoiceId}`);
  revalidatePath("/payments");
}
