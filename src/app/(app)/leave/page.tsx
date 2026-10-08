import { requireUser, hasPermission } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/labels";
import { getBalances } from "@/lib/services/leave-balance";
import { ApplyLeaveForm, CancelLeaveButton, DecideLeave } from "./leave-forms";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const user = await requireUser();
  const canSelf = hasPermission(user, PERMISSIONS.LEAVE_SELF);
  const canManage = hasPermission(user, PERMISSIONS.LEAVE_MANAGE);
  if (!canSelf && !canManage) redirect("/403");

  const year = new Date().getFullYear();
  const myLeave = canSelf && user.employeeId
    ? await prisma.leaveRequest.findMany({ where: { employeeId: user.employeeId }, orderBy: { createdAt: "desc" }, take: 30 })
    : [];
  const myBalances = canSelf && user.employeeId ? await getBalances(user.employeeId, year) : [];

  const pending = canManage
    ? await prisma.leaveRequest.findMany({ where: { status: "PENDING" }, include: { employee: true }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <div>
      <PageHeader title="Leave" subtitle={canSelf ? `Your leave balance for ${year}` : undefined} />

      {canSelf && myBalances.length > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {myBalances.map((b) => {
            const allocated = Number(b.allocated);
            const used = Number(b.used);
            const remaining = Math.max(0, allocated - used);
            return (
              <Card key={b.id}>
                <CardContent className="pt-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{titleCase(b.type)} Leave</p>
                  <p className="mt-1 text-2xl font-bold text-navy">{remaining}<span className="text-base font-normal text-muted-foreground"> / {allocated} left</span></p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{used} used</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {canSelf ? (
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Apply for Leave</CardTitle></CardHeader>
            <CardContent>
              {user.employeeId ? <ApplyLeaveForm /> : <p className="text-sm text-muted-foreground">No employee profile linked to your account.</p>}
            </CardContent>
          </Card>
        ) : null}

        <div className={canSelf ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
          {canManage && pending.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Pending Approvals ({pending.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pending.map((l) => (
                  <div key={l.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-navy">{l.employee.name} · {titleCase(l.type)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(l.fromDate)} → {formatDate(l.toDate)} ({l.days.toString()} days){l.reason ? ` · ${l.reason}` : ""}</p>
                    </div>
                    <DecideLeave leaveId={l.id} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {canSelf ? (
            <Card>
              <CardHeader><CardTitle>My Leave</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <THead><TR><TH>Type</TH><TH>Dates</TH><TH>Days</TH><TH>Status</TH><TH></TH></TR></THead>
                  <TBody>
                    {myLeave.length === 0 ? (
                      <TR><TD colSpan={5} className="py-6 text-center text-muted-foreground">No leave requests.</TD></TR>
                    ) : (
                      myLeave.map((l) => (
                        <TR key={l.id}>
                          <TD>{titleCase(l.type)}</TD>
                          <TD>{formatDate(l.fromDate)} → {formatDate(l.toDate)}</TD>
                          <TD>{l.days.toString()}</TD>
                          <TD><Badge tone={statusTone(l.status)}>{titleCase(l.status)}</Badge></TD>
                          <TD>{l.status === "PENDING" ? <CancelLeaveButton leaveId={l.id} /> : null}</TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
