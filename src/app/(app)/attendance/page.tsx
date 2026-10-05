import { requireUser, hasPermission } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { ClockWidget } from "./clock-widget";
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

  return (
    <div>
      <PageHeader title="Attendance" subtitle={formatDate(today)} />
      <div className="grid gap-6 lg:grid-cols-3">
        {widget ? <div className="lg:col-span-1">{widget}</div> : null}

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
