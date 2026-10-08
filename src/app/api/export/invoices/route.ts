import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { toCsv, csvResponse } from "@/lib/csv";
import { subtract } from "@/lib/money";

export const runtime = "nodejs";

/** GET /api/export/invoices — Admin-only CSV of all invoices. */
export async function GET() {
  const user = await currentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPORT_EXPORT_FINANCIAL)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const invoices = await prisma.invoice.findMany({ include: { client: true }, orderBy: { invoiceDate: "desc" } });
  const csv = toCsv(
    ["Number", "Client", "Invoice Date", "Due Date", "Status", "Subtotal", "Tax", "Total", "Paid", "Outstanding"],
    invoices.map((i) => [
      i.number,
      i.client.name,
      i.invoiceDate.toISOString().slice(0, 10),
      i.dueDate.toISOString().slice(0, 10),
      i.status,
      i.subtotal.toString(),
      i.taxAmount.toString(),
      i.total.toString(),
      i.amountPaid.toString(),
      subtract(i.total, i.amountPaid).toFixed(2),
    ]),
  );
  return csvResponse(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
