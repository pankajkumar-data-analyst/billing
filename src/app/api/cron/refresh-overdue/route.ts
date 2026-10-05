import { NextResponse } from "next/server";
import { refreshOverdueInvoices } from "@/lib/services/invoice-refresh";

/**
 * Nightly cron (Vercel Cron, configured in vercel.json) to flip past-due
 * invoices to OVERDUE. Protected by CRON_SECRET: Vercel sends
 * `Authorization: Bearer <CRON_SECRET>`. The app also refreshes on-demand when
 * invoices/dashboard load, so this is a safety net rather than the only path.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }
  await refreshOverdueInvoices();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}
