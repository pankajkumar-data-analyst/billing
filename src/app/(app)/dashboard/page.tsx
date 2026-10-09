import Link from "next/link";
import { requireUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { refreshOverdueInvoices } from "@/lib/services/invoice-refresh";
import { getAdminDashboard, getRevenueByClient } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/app/page-header";
import { KpiCard } from "@/components/app/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueTrendChart, PipelineChart, StatusPie, RevenueByClientChart } from "@/components/app/charts";
import { ClockWidget } from "../attendance/clock-widget";
import { buttonVariants } from "@/components/ui/button";
import { formatINRCompact, formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/labels";
import { guaranteeState } from "@/lib/services/guarantee";
import { Badge, statusTone } from "@/components/ui/badge";
import {
  Wallet, TrendingUp, TrendingDown, Clock, AlertTriangle, FileText, Building2,
  Briefcase, Users, UserCheck, CalendarClock, Banknote, Receipt,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const isAdminView = hasPermission(user, PERMISSIONS.DASHBOARD_ADMIN_VIEW);

  if (isAdminView) return <AdminDashboard />;
  return <EmployeeDashboard userId={user.id} name={user.name} employeeId={user.employeeId} />;
}

async function AdminDashboard() {
  await refreshOverdueInvoices();
  const [{ kpis, charts }, revenueByClient, expiring] = await Promise.all([
    getAdminDashboard(),
    getRevenueByClient(),
    prisma.placement.findMany({
      where: { status: "JOINED", guaranteeEnd: { not: null } },
      include: { candidate: true, client: true },
      orderBy: { guaranteeEnd: "asc" },
      take: 50,
    }),
  ]);

  const expiringSoon = expiring
    .map((p) => ({ p, state: guaranteeState(p.guaranteeEnd) }))
    .filter(({ state }) => state === "EXPIRING_SOON" || state === "EXPIRES_TOMORROW")
    .slice(0, 6);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your business at a glance." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Revenue (Collected)" value={formatINRCompact(kpis.totalRevenue)} tone="success" icon={Wallet} />
        <KpiCard label="Revenue This Month" value={formatINRCompact(kpis.revenueThisMonth)} icon={TrendingUp} />
        <KpiCard label="Pending Receivables" value={formatINRCompact(kpis.pendingReceivables)} tone="warning" href="/invoices" icon={Clock} />
        <KpiCard label="Overdue" value={formatINRCompact(kpis.overduePayments)} tone="danger" href="/invoices?status=OVERDUE" icon={AlertTriangle} />
        <KpiCard label="Total Invoices" value={String(kpis.totalInvoices)} hint={`${kpis.paidInvoices} paid`} href="/invoices" icon={FileText} />
        <KpiCard label="Active Clients" value={String(kpis.activeClients)} href="/clients?status=ACTIVE" icon={Building2} />
        <KpiCard label="Active Jobs" value={String(kpis.activeJobs)} href="/jobs" icon={Briefcase} />
        <KpiCard label="Candidates in Pipeline" value={String(kpis.candidatesInPipeline)} href="/candidates" icon={Users} />
        <KpiCard label="Placements This Month" value={String(kpis.placementsThisMonth)} href="/placements" icon={UserCheck} />
        <KpiCard label="Present Today" value={String(kpis.employeesPresent)} hint={`${kpis.employeesAbsent} absent`} href="/attendance" icon={CalendarClock} />
        <KpiCard label="Month Payroll" value={formatINRCompact(kpis.currentMonthPayroll)} href="/payroll" icon={Banknote} />
        <KpiCard label="Month Expenses" value={formatINRCompact(kpis.currentMonthExpenses)} href="/expenses" icon={Receipt} />
      </div>

      <div className="mb-6">
        <KpiCard
          label="Estimated Net Profit (This Month)"
          value={formatINR(kpis.estimatedNetProfit)}
          hint="Collected - expenses - payroll (indicative)"
          tone={kpis.estimatedNetProfit.isNegative() ? "danger" : "success"}
          icon={kpis.estimatedNetProfit.isNegative() ? TrendingDown : TrendingUp}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Revenue (last 6 months)</CardTitle></CardHeader>
          <CardContent><RevenueTrendChart data={charts.revenueTrend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Invoice Status</CardTitle></CardHeader>
          <CardContent><StatusPie data={charts.invoiceStatus} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recruitment Pipeline</CardTitle></CardHeader>
          <CardContent><PipelineChart data={charts.pipeline} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue by Client</CardTitle></CardHeader>
          <CardContent><RevenueByClientChart data={revenueByClient} /></CardContent>
        </Card>
      </div>

      {expiringSoon.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Replacement Guarantees Expiring Soon</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {expiringSoon.map(({ p, state }) => (
              <div key={p.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <Link href={`/placements/${p.id}`} className="text-sm font-medium text-navy hover:underline">{p.candidate.fullName}</Link>
                  <p className="text-xs text-muted-foreground">{p.client.name} · ends {formatDate(p.guaranteeEnd)}</p>
                </div>
                <Badge tone={statusTone(state)}>{titleCase(state)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

async function EmployeeDashboard({ name, employeeId }: { userId: string; name: string; employeeId: string | null }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [todayRow, assignedJobs, pendingLeave] = employeeId
    ? await Promise.all([
        prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } }),
        prisma.job.findMany({ where: { recruiterId: employeeId, status: { in: ["NEW", "ACTIVE", "ON_HOLD", "INTERVIEWING", "SUBMITTED"] } }, include: { client: true }, take: 10 }),
        prisma.leaveRequest.count({ where: { employeeId, status: "PENDING" } }),
      ])
    : [null, [], 0];

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          {employeeId ? (
            <ClockWidget
              name={name}
              clockInAt={todayRow?.clockIn ? todayRow.clockIn.toISOString() : null}
              clockOutAt={todayRow?.clockOut ? todayRow.clockOut.toISOString() : null}
              workedMinutes={todayRow?.workedMinutes ?? 0}
            />
          ) : (
            <Card><CardContent className="pt-5 text-sm text-muted-foreground">No employee profile is linked to your account.</CardContent></Card>
          )}
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Leave Requests</p>
              <p className="mt-1 text-2xl font-bold text-navy">{pendingLeave}</p>
              <Link href="/leave" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}>Manage Leave</Link>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>My Assigned Jobs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {assignedJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active jobs assigned to you.</p>
            ) : (
              assignedJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <Link href={`/jobs/${j.id}`} className="text-sm font-medium text-navy hover:underline">{j.title}</Link>
                  <span className="text-xs text-muted-foreground">{j.client.name}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
