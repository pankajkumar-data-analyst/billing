import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/services/notify";

/**
 * Recompute OVERDUE status for open invoices (spec §13: auto-overdue by due
 * date).
 *
 * `refreshOverdueInvoices()` is the cheap, read-safe version used on page
 * loads: a SINGLE bulk `updateMany` (no per-row updates, no notifications, no
 * N+1). An invoice is overdue when it is SENT with nothing paid and its due
 * date has passed. (PARTIALLY_PAID means money came in, so we don't auto-flag
 * it overdue here.)
 *
 * `refreshOverdueInvoicesAndNotify()` is for the nightly cron and additionally
 * notifies admins about the invoices that newly became overdue.
 */

export async function refreshOverdueInvoices(): Promise<void> {
  // One statement, no loop: flip SENT + unpaid + past-due -> OVERDUE.
  await prisma.invoice.updateMany({
    where: {
      status: "SENT",
      amountPaid: { lte: 0 },
      dueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    data: { status: "OVERDUE" },
  });
}

/** Cron variant: flip + notify admins about the newly-overdue invoices. */
export async function refreshOverdueInvoicesAndNotify(): Promise<number> {
  const cutoff = new Date(new Date().setHours(0, 0, 0, 0));
  const soonOverdue = await prisma.invoice.findMany({
    where: { status: "SENT", amountPaid: { lte: 0 }, dueDate: { lt: cutoff } },
    select: { id: true, number: true, client: { select: { name: true } } },
  });
  if (soonOverdue.length === 0) return 0;

  await prisma.invoice.updateMany({
    where: { id: { in: soonOverdue.map((i) => i.id) } },
    data: { status: "OVERDUE" },
  });
  for (const inv of soonOverdue) {
    await notifyAdmins("Invoice overdue", `${inv.number} (${inv.client.name}) is now overdue.`, `/invoices/${inv.id}`);
  }
  return soonOverdue.length;
}
