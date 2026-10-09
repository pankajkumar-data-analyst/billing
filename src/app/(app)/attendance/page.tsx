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
import { AttendanceCalendar, MonthNav, type DayCell } from "./attendance-calendar";
import { HolidayForm, HolidayList } from "./holiday-forms";
import { getSettings } from "@/lib/services/settings";
import { holidaysInMonth } from "@/lib/services/holidays";
import { formatDate, formatTime } from "@/lib/utils";
import { formatWorkedDuration } from "@/lib/services/attendance";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AttendancePage({ searchParams }: { searchParams: { y?: string; m?: string } }) {
  const user = await requireUser();
  const canSelf = hasPermission(user, PERMISSIONS.ATTENDANCE_SELF);
  const canManage = hasPermission(user, PERMISSIONS.ATTENDANCE_MANAGE);
  if (!canSelf && !canManage) redirect("/403");

  const today = todayDate();
  const now = new Date();
  const calYear = Number(searchParams.y) || now.getFullYear();
  const calMonth = Number(searchParams.m) || now.getMonth() + 1; // 1-12

  const empId = user.employeeId ?? "__none__";
  const monthRange = { gte: new Date(calYear, calMonth - 1, 1), lte: new Date(calYear, calMonth, 0) };

  // Batch every independent read into one round-trip set (was ~9 sequential
  // queries → now parallel). Each is conditional on role via empty fallbacks.
  const [
    todayRow,
    history,
    todayAllRows,
    myCorrections,
    pendingCorrections,
    settings,
    holidayMap,
    monthAttendance,
    allHolidayRows,
  ] = await Promise.all([
    canSelf && user.employeeId
      ? prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: empId, date: today } } })
      : Promise.resolve(null),
    canSelf && user.employeeId
      ? prisma.attendance.findMany({ where: { employeeId: empId }, orderBy: { date: "desc" }, take: 30 })
      : Promise.resolve([]),
    canManage
      ? prisma.attendance.findMany({ where: { date: today }, include: { employee: true }, orderBy: { employee: { name: "asc" } } })
      : Promise.resolve([]),
    canSelf && user.employeeId
      ? prisma.attendanceCorrection.findMany({ where: { employeeId: empId }, orderBy: { createdAt: "desc" }, take: 10 })
      : Promise.resolve([]),
    canManage
      ? prisma.attendanceCorrection.findMany({ where: { status: "PENDING" }, include: { employee: true }, orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    getSettings(),
    holidaysInMonth(calYear, calMonth),
    canSelf && user.employeeId
      ? prisma.attendance.findMany({ where: { employeeId: empId, date: monthRange } })
      : Promise.resolve([]),
    canManage ? prisma.holiday.findMany({ orderBy: { date: "asc" } }) : Promise.resolve([]),
  ]);

  const widget = canSelf && user.employeeId ? (
    <ClockWidget
      name={user.name}
      clockInAt={todayRow?.clockIn ? todayRow.clockIn.toISOString() : null}
      clockOutAt={todayRow?.clockOut ? todayRow.clockOut.toISOString() : null}
      workedMinutes={todayRow?.workedMinutes ?? 0}
    />
  ) : null;

  const todayAll = todayAllRows.map((r) => ({ name: r.employee.name, status: r.status, clockIn: r.clockIn, clockOut: r.clockOut, worked: r.workedMinutes }));

  // ---- Build calendar cells ----
  const weeklyOff = new Set(settings.weeklyOff.split(",").map((s) => s.trim()));
  const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();

  const calDays: Record<number, DayCell> = {};
  const attByDay = new Map<number, (typeof monthAttendance)[number]>();
  for (const a of monthAttendance) attByDay.set(a.date.getDate(), a);

  const summary = { present: 0, half: 0, absent: 0, leave: 0, holiday: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = new Date(calYear, calMonth - 1, d).getDay();
    const isWeekend = weeklyOff.has(DAY_ABBR[dow]);
    const holidayName = holidayMap.get(dateKey);
    const att = attByDay.get(d);

    let cell: DayCell;
    if (att) {
      cell = { status: att.status, workedLabel: att.workedMinutes > 0 ? formatWorkedDuration(att.workedMinutes) : null };
      if (["PRESENT", "LATE"].includes(att.status)) summary.present++;
      else if (att.status === "HALF_DAY") summary.half++;
      else if (att.status === "ON_LEAVE") summary.leave++;
      else summary.absent++;
    } else if (holidayName) {
      cell = { status: "HOLIDAY", holidayName };
      summary.holiday++;
    } else if (isWeekend) {
      cell = { status: "WEEKEND" };
    } else {
      cell = { status: null };
    }
    calDays[d] = cell;
  }

  const allHolidays = allHolidayRows.map((h) => ({
    id: h.id, date: h.date.toISOString(), name: h.name, recurring: h.recurring,
  }));

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
                    Forgot to clock in/out or wrong time? Request a correction - an admin will review it.
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
              <CardHeader><CardTitle>Today - All Employees</CardTitle></CardHeader>
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
                          <TD>{r.clockIn ? formatTime(r.clockIn) : "-"}</TD>
                          <TD>{r.clockOut ? formatTime(r.clockOut) : "-"}</TD>
                          <TD>{r.worked > 0 ? formatWorkedDuration(r.worked) : "-"}</TD>
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

          {canSelf && user.employeeId ? (
            <Card className="mb-6">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>My Attendance Calendar</CardTitle>
                <MonthNav year={calYear} month={calMonth} />
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                  <span>Present: <strong className="text-green-700">{summary.present}</strong></span>
                  <span>Half: <strong className="text-amber-700">{summary.half}</strong></span>
                  <span>Leave: <strong className="text-blue-700">{summary.leave}</strong></span>
                  <span>Absent/Short: <strong className="text-red-700">{summary.absent}</strong></span>
                  <span>Holidays: <strong className="text-purple-700">{summary.holiday}</strong></span>
                </div>
                <AttendanceCalendar year={calYear} month={calMonth} days={calDays} />
              </CardContent>
            </Card>
          ) : null}

          {canManage ? (
            <Card className="mb-6">
              <CardHeader><CardTitle>Holidays</CardTitle></CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <HolidayForm />
                <HolidayList holidays={allHolidays} />
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
                        <TD>{r.clockIn ? formatTime(r.clockIn) : "-"}</TD>
                        <TD>{r.clockOut ? formatTime(r.clockOut) : "-"}</TD>
                        <TD>{r.workedMinutes > 0 ? formatWorkedDuration(r.workedMinutes) : "-"}</TD>
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
