import { requireUser, hasPermission } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { ClockWidget } from "./clock-widget";
import { RegularizeForm, DecideRegularization } from "./regularize-forms";
import { formatDate, formatTime } from "@/lib/utils";
import { formatWorkedDuration } from "@/lib/services/attendance";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AttendancePage() {
  const user = await requireUser();
  const canSelf = hasPermission(user, PERMISSIONS.ATTENDANCE_SELF);
  const canManage = hasPermission(user, PERMISSIONS.ATTENDANCE_MANAGE);
  if (!canSelf && !canManage) redirect("/403");

  const today = todayDate();

  // Self widget + history (if the user is an employee).
  let widget = null;
  let history: Awaited<ReturnType<typeof prisma.attendance.findMany>> = [];
  if (canSelf && user.employeeId) {
    const todayRow = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: user.employeeId, date: today } },
    });
    widget = (
      <ClockWidget
        name={user.name}
        clockInAt={todayRow?.clockIn ? todayRow.clockIn.toISOString() : null}
        clockOutAt={todayRow?.clockOut ? todayRow.clockOut.toISOString() : null}
        workedMinutes={todayRow?.workedMinutes ?? 0}
      />
    );
    history = await prisma.attendance.findMany({
      where: { employeeId: user.employeeId },
      orderBy: { date: "desc" },
      take: 30,
    });
  }

  // Admin: everyone's attendance today.
  let todayAll: { name: string; status: string; clockIn: Date | null; clockOut: Date | null; worked: number }[] = [];
  if (canManage) {
    const rows = await prisma.attendance.findMany({
      where: { date: today },
      include: { employee: true },
      orderBy: { employee: { name: "asc" } },
    });
    todayAll = rows.map((r) => ({ name: r.employee.name, status: r.status, clockIn: r.clockIn, clockOut: r.clockOut, worked: r.workedMinutes }));
  }

  // Regularization: employee's own history; admin's pending queue.
  const myCorrections = canSelf && user.employeeId
    ? await prisma.attendanceCorrection.findMany({ where: { employeeId: user.employeeId }, orderBy: { createdAt: "desc" }, take: 10 })
    : [];
  const pendingCorrections = canManage
    ? await prisma.attendanceCorrection.findMany({ where: { status: "PENDING" }, include: { employee: true }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <div>
      <PageHeader title="Attendance" subtitle={formatDate(today)} />
      <div className="grid gap-6 lg:grid-cols-3">
        {widget ? (
          <div className="space-y-6 lg:col-span-1">
            {widget}
            {canSelf && user.employeeId ? (
              <Card>
                <CardHeader><CardTitle>Attendance Regularization</CardTitle></CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Forgot to clock in/out or wrong time? Request a correction — an admin will review it.
                  </p>
                  <RegularizeForm />
                  {myCorrections.length > 0 ? (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">My Requests</p>
                      {myCorrections.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <span>{formatDate(c.date)}</span>
                          <Badge tone={statusTone(c.status)}>{titleCase(c.status)}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        <div className={widget ? "lg:col-span-2" : "lg:col-span-3"}>
          {canManage ? (
            <Card className="mb-6">
              <CardHeader><CardTitle>Today — All Employees</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <THead><TR><TH>Employee</TH><TH>In</TH><TH>Out</TH><TH>Worked</TH><TH>Status</TH></TR></THead>
                  <TBody>
                    {todayAll.length === 0 ? (
                      <TR><TD colSpan={5} className="py-6 text-center text-muted-foreground">No attendance marked yet today.</TD></TR>
                    ) : (
                      todayAll.map((r, i) => (
                        <TR key={i}>
                          <TD className="font-medium">{r.name}</TD>
                          <TD>{r.clockIn ? formatTime(r.clockIn) : "—"}</TD>
                          <TD>{r.clockOut ? formatTime(r.clockOut) : "—"}</TD>
                          <TD>{r.worked > 0 ? formatWorkedDuration(r.worked) : "—"}</TD>
                          <TD><Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge></TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {canManage && pendingCorrections.length > 0 ? (
            <Card className="mb-6">
              <CardHeader><CardTitle>Regularization Requests ({pendingCorrections.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pendingCorrections.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-navy">{c.employee.name} · {formatDate(c.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.requestedIn ? `In ${formatTime(c.requestedIn)}` : ""}
                        {c.requestedOut ? ` · Out ${formatTime(c.requestedOut)}` : ""}
                        {c.reason ? ` · ${c.reason}` : ""}
                      </p>
                    </div>
                    <DecideRegularization id={c.id} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {history.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>My Recent Attendance</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <THead><TR><TH>Date</TH><TH>In</TH><TH>Out</TH><TH>Worked</TH><TH>Status</TH></TR></THead>
                  <TBody>
                    {history.map((r) => (
                      <TR key={r.id}>
                        <TD>{formatDate(r.date)}</TD>
                        <TD>{r.clockIn ? formatTime(r.clockIn) : "—"}</TD>
                        <TD>{r.clockOut ? formatTime(r.clockOut) : "—"}</TD>
                        <TD>{r.workedMinutes > 0 ? formatWorkedDuration(r.workedMinutes) : "—"}</TD>
                        <TD><Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge></TD>
                      </TR>
                    ))}
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
