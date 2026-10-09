import { requireUser, hasPermission } from "@/lib/auth/guards";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { GeneratePayroll, PayslipActions, BonusEditor } from "./payroll-controls";

export const dynamic = "force-dynamic";

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function PayrollPage({ searchParams }: { searchParams: { y?: string; m?: string } }) {
  const user = await requireUser();
  const canProcess = hasPermission(user, PERMISSIONS.PAYROLL_PROCESS);
  const canSelf = hasPermission(user, PERMISSIONS.PAYSLIP_SELF_VIEW);
  if (!canProcess && !canSelf) redirect("/403");

  const now = new Date();
  const year = Number(searchParams.y) || now.getFullYear();
  const month = Number(searchParams.m) || now.getMonth() + 1;

  if (canProcess) {
    const slips = await prisma.payslip.findMany({
      where: { periodYear: year, periodMonth: month },
      include: { employee: true },
      orderBy: { employee: { name: "asc" } },
    });
    const totalNet = slips.reduce((acc, s) => acc + Number(s.netSalary), 0);

    return (
      <div>
        <PageHeader title="Payroll" subtitle={`${MONTHS[month]} ${year} · estimated net ${formatINR(totalNet)}`} />
        <Card className="mb-6"><CardHeader><CardTitle>Generate / Review</CardTitle></CardHeader>
          <CardContent>
            <GeneratePayroll year={year} month={month} />
            <p className="mt-3 text-xs text-muted-foreground">
              Generates DRAFT payslips from attendance + approved leave. Review, Approve, then Mark Paid.
              No money is transferred - Phase 1 produces statements only.
            </p>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <THead><TR><TH>Employee</TH><TH>Working</TH><TH>Present</TH><TH>Extra</TH><TH>LOP</TH><TH>Gross</TH><TH>Bonus</TH><TH>Net</TH><TH>Status</TH><TH></TH></TR></THead>
            <TBody>
              {slips.length === 0 ? (
                <TR><TD colSpan={10} className="py-10 text-center text-muted-foreground">No payslips for this period. Click Generate Payroll.</TD></TR>
              ) : (
                slips.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium">{s.employee.name}</TD>
                    <TD>{s.workingDays}</TD>
                    <TD>{s.presentDays.toString()}</TD>
                    <TD>{Number(s.extraDays) > 0 ? <span className="text-green-700">+{s.extraDays.toString()}</span> : "-"}</TD>
                    <TD>{s.lopDays.toString()}</TD>
                    <TD>{formatINR(s.grossSalary)}</TD>
                    <TD>{Number(s.bonus) > 0 ? <span className="text-green-700">{formatINR(s.bonus)}</span> : "-"}</TD>
                    <TD className="font-semibold">{formatINR(s.netSalary)}</TD>
                    <TD><Badge tone={statusTone(s.status)}>{s.status}</Badge></TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-2">
                        {s.status === "DRAFT" ? <BonusEditor id={s.id} bonus={s.bonus.toString()} deductions={s.deductions.toString()} /> : null}
                        <PayslipActions id={s.id} status={s.status} />
                        <Link href={`/payroll/${s.id}/pdf`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
                          Payslip
                        </Link>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </div>
    );
  }

  // Employee: own payslips only.
  const slips = user.employeeId
    ? await prisma.payslip.findMany({ where: { employeeId: user.employeeId, status: { in: ["APPROVED", "PAID"] } }, orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }] })
    : [];

  return (
    <div>
      <PageHeader title="My Payslips" />
      <Card>
        <Table>
          <THead><TR><TH>Period</TH><TH>Working</TH><TH>Present</TH><TH>Gross</TH><TH>Net</TH><TH>Status</TH><TH></TH></TR></THead>
          <TBody>
            {slips.length === 0 ? (
              <TR><TD colSpan={7} className="py-10 text-center text-muted-foreground">No payslips available yet.</TD></TR>
            ) : (
              slips.map((s) => (
                <TR key={s.id}>
                  <TD>{MONTHS[s.periodMonth]} {s.periodYear}</TD>
                  <TD>{s.workingDays}</TD>
                  <TD>{s.presentDays.toString()}</TD>
                  <TD>{formatINR(s.grossSalary)}</TD>
                  <TD className="font-semibold">{formatINR(s.netSalary)}</TD>
                  <TD><Badge tone={statusTone(s.status)}>{s.status}</Badge></TD>
                  <TD>
                    <Link href={`/payroll/${s.id}/pdf`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Download
                    </Link>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
