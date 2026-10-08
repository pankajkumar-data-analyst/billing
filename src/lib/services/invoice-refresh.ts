import { prisma } from "@/lib/prisma";
import { deriveInvoiceStatus } from "@/lib/services/invoice";
import { notifyAdmins } from "@/lib/services/notify";

/**
 * Recompute OVERDUE status for open invoices (spec §13: auto-overdue by due
 * date). Called when listing invoices / loading the dashboard so statuses are
 * always current without needing a cron job in Phase 1. Idempotent and cheap.
 *
 * In production a scheduled job (Vercel Cron) can call this nightly too — see
 * README. CANCELLED/PAID invoices are never touched.
 */
export async function refreshOverdueInvoices(): Promise<void> {
  const open = await prisma.invoice.findMany({
    where: { status: { in: ["SENT", "PARTIALLY_PAID"] } },
    select: { id: true, status: true, total: true, amountPaid: true, dueDate: true },
  });
  const now = new Date();
  for (const inv of open) {
    // Only flip to OVERDUE when nothing is paid and past due.
    const next = deriveInvoiceStatus({
      current: inv.status as "SENT" | "PARTIALLY_PAID",
      total: inv.total,
      amountPaid: inv.amountPaid,
      dueDate: inv.dueDate,
      now,
    });
    if (next === "OVERDUE" && inv.status !== "OVERDUE") {
      const updated = await prisma.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" }, include: { client: true } });
      await notifyAdmins("Invoice overdue", `${updated.number} (${updated.client.name}) is now overdue.`, `/invoices/${updated.id}`);
    }
  }
}
