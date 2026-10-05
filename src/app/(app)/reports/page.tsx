import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { getAdminDashboard, getRevenueByClient } from "@/lib/services/dashboard";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { KpiCard } from "@/components/app/kpi-card";
import { formatINR, formatINRCompact } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Finance/Revenue report (spec §22). Admin-only. Financial CSV export is a
 * documented Phase-2 item; this page gives the key figures on screen.
 */
export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.REPORT_VIEW);
  const [{ kpis }, byClient, placementStats] = await Promise.all([
    getAdminDashboard(),
    getRevenueByClient(10),
    prisma.placement.aggregate({ _count: true, _avg: { calculatedFee: true }, _sum: { calculatedFee: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Revenue & Finance Report" subtitle="Billing, collections and profitability overview." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Collected" value={formatINRCompact(kpis.totalRevenue)} tone="success" />
        <KpiCard label="Outstanding" value={formatINRCompact(kpis.pendingReceivables)} tone="warning" />
        <KpiCard label="Overdue" value={formatINRCompact(kpis.overduePayments)} tone="danger" />
        <KpiCard label="Revenue This Year" value={formatINRCompact(kpis.revenueThisYear)} />
        <KpiCard label="Placements" value={String(placementStats._count)} />
        <KpiCard label="Avg Fee / Placement" value={formatINR(placementStats._avg.calculatedFee ?? 0)} />
        <KpiCard label="Month Expenses" value={formatINRCompact(kpis.currentMonthExpenses)} />
        <KpiCard label="Month Payroll" value={formatINRCompact(kpis.currentMonthPayroll)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue by Client</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>Client</TH><TH>Collected</TH></TR></THead>
            <TBody>
              {byClient.length === 0 ? (
                <TR><TD colSpan={2} className="py-6 text-center text-muted-foreground">No revenue yet.</TD></TR>
              ) : (
                byClient.map((r) => (
                  <TR key={r.label}><TD className="font-medium">{r.label}</TD><TD>{formatINR(r.value)}</TD></TR>
                ))
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        CSV/Excel export of financial reports is a documented Phase-2 enhancement.
      </p>
    </div>
  );
}
