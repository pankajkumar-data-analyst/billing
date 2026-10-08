import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { toCsv, csvResponse } from "@/lib/csv";

export const runtime = "nodejs";

/** GET /api/export/payments — Admin-only CSV of all payments. */
export async function GET() {
  const user = await currentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPORT_EXPORT_FINANCIAL)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const payments = await prisma.payment.findMany({ include: { client: true, invoice: true }, orderBy: { paymentDate: "desc" } });
  const csv = toCsv(
    ["Date", "Client", "Invoice", "Amount", "Mode", "Reference", "Reversed"],
    payments.map((p) => [
      p.paymentDate.toISOString().slice(0, 10),
      p.client.name,
      p.invoice.number,
      p.amount.toString(),
      p.mode,
      p.reference ?? "",
      p.isReversed ? "Yes" : "No",
    ]),
  );
  return csvResponse(`payments-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
