import { prisma } from "@/lib/prisma";
import { sum, subtract, toDecimal } from "@/lib/money";
import { Decimal } from "decimal.js";

/**
 * Admin dashboard aggregation (spec §5, §52). Returns the KPIs and chart data
 * the owner needs to run the business at a glance. All money via Decimal.
 */
export async function getAdminDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [invoices, payments, placements, clients, jobs, pipeline, employees, attendanceToday, expensesMonth, payslipsMonth] =
    await Promise.all([
      prisma.invoice.findMany({ where: { status: { not: "CANCELLED" } }, select: { total: true, amountPaid: true, status: true, invoiceDate: true } }),
      prisma.payment.findMany({ where: { isReversed: false }, select: { amount: true, paymentDate: true } }),
      prisma.placement.findMany({ select: { calculatedFee: true, joiningDate: true } }),
      prisma.client.count({ where: { status: "ACTIVE" } }),
      prisma.job.count({ where: { status: { in: ["NEW", "ACTIVE", "ON_HOLD", "INTERVIEWING", "SUBMITTED"] } } }),
      prisma.candidateApplication.groupBy({ by: ["stage"], _count: true }),
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.attendance.findMany({ where: { date: today }, select: { status: true } }),
      prisma.expense.findMany({ where: { expenseDate: { gte: monthStart } }, select: { amount: true } }),
      prisma.payslip.findMany({ where: { periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1 }, select: { netSalary: true } }),
    ]);

  const totalBilled = sum(invoices.map((i) => i.total));
  const totalCollected = sum(payments.map((p) => p.amount));
  const outstanding = subtract(totalBilled, sum(invoices.map((i) => i.amountPaid)));
  const overdue = sum(invoices.filter((i) => i.status === "OVERDUE").map((i) => subtract(i.total, i.amountPaid)));
  const revenueThisMonth = sum(payments.filter((p) => p.paymentDate >= monthStart).map((p) => p.amount));
  const revenueThisYear = sum(payments.filter((p) => p.paymentDate >= yearStart).map((p) => p.amount));

  const paidInvoices = invoices.filter((i) => i.status === "PAID").length;
  const placementsThisMonth = placements.filter((p) => p.joiningDate >= monthStart).length;

  const present = attendanceToday.filter((a) => ["PRESENT", "LATE", "HALF_DAY"].includes(a.status)).length;
  const onLeave = attendanceToday.filter((a) => a.status === "ON_LEAVE").length;
  const absent = Math.max(0, employees - present - onLeave);

  const expensesMonthTotal = sum(expensesMonth.map((e) => e.amount));
  const payrollMonthTotal = sum(payslipsMonth.map((p) => p.netSalary));
  // Estimated net profit = collected this month - expenses - payroll (indicative).
  const estimatedProfit = subtract(subtract(revenueThisMonth, expensesMonthTotal), payrollMonthTotal);

  // Monthly revenue trend (last 6 months) from collected payments.
  const trend: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const v = sum(payments.filter((p) => p.paymentDate >= d && p.paymentDate < next).map((p) => p.amount));
    trend.push({ label: d.toLocaleString("en-IN", { month: "short" }), value: v.toNumber() });
  }

  const invoiceStatusCounts = countBy(
    (await prisma.invoice.findMany({ select: { status: true } })).map((i) => i.status),
  );
  const pipelineCounts = pipeline.map((p) => ({ stage: p.stage, count: p._count }));

  return {
    kpis: {
      totalRevenue: totalCollected,
      revenueThisMonth,
      revenueThisYear,
      pendingReceivables: outstanding,
      overduePayments: overdue,
      totalInvoices: invoices.length,
      paidInvoices,
      activeClients: clients,
      activeJobs: jobs,
      candidatesInPipeline: pipelineCounts.filter((p) => !["JOINED", "REJECTED", "DROPPED", "REPLACED"].includes(p.stage)).reduce((a, b) => a + b.count, 0),
      placementsThisMonth,
      employeesPresent: present,
      employeesAbsent: absent,
      currentMonthPayroll: payrollMonthTotal,
      currentMonthExpenses: expensesMonthTotal,
      estimatedNetProfit: estimatedProfit,
    },
    charts: {
      revenueTrend: trend,
      invoiceStatus: invoiceStatusCounts,
      pipeline: pipelineCounts,
    },
  };
}

function countBy(items: string[]): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const it of items) map.set(it, (map.get(it) ?? 0) + 1);
  return [...map.entries()].map(([label, value]) => ({ label: label.replace("_", " "), value }));
}

/** Revenue by client — top earners (spec §5, §22). */
export async function getRevenueByClient(limit = 6) {
  const rows = await prisma.payment.groupBy({
    by: ["clientId"],
    where: { isReversed: false },
    _sum: { amount: true },
  });
  const clients = await prisma.client.findMany({ where: { id: { in: rows.map((r) => r.clientId) } }, select: { id: true, name: true } });
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  return rows
    .map((r) => ({ label: nameById.get(r.clientId) ?? "Unknown", value: toDecimal(r._sum.amount ?? new Decimal(0)).toNumber() }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
