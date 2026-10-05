import { Decimal } from "decimal.js";

/**
 * Attendance calculations — centralized (spec §17, §18, §50).
 * All rules (office hours, grace, half-day/full-day thresholds) come from
 * CompanySettings and are passed in — never hardcoded.
 */

export interface AttendanceRules {
  officeStartTime: string; // "HH:mm"
  officeEndTime: string; // "HH:mm"
  graceMinutes: number;
  halfDayHours: number;
  fullDayHours: number;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY";

export interface WorkedResult {
  workedMinutes: number;
  isLate: boolean;
  status: AttendanceStatus;
}

/** Minutes between clock-in and clock-out (clamped at 0). */
export function workedMinutes(clockIn: Date, clockOut: Date): number {
  const ms = clockOut.getTime() - clockIn.getTime();
  return Math.max(0, Math.round(ms / 60000));
}

/** Was the clock-in after office start + grace? */
export function isLate(clockIn: Date, rules: AttendanceRules): boolean {
  const [h, m] = rules.officeStartTime.split(":").map(Number);
  const start = new Date(clockIn);
  start.setHours(h, m + rules.graceMinutes, 0, 0);
  return clockIn.getTime() > start.getTime();
}

/**
 * Evaluate a full day's attendance once the employee has clocked out.
 * HALF_DAY if worked < halfDayHours; else PRESENT (or LATE flag).
 */
export function evaluateAttendance(
  clockIn: Date,
  clockOut: Date,
  rules: AttendanceRules,
): WorkedResult {
  const mins = workedMinutes(clockIn, clockOut);
  const hours = mins / 60;
  const late = isLate(clockIn, rules);

  let status: AttendanceStatus;
  if (hours < rules.halfDayHours) status = "HALF_DAY";
  else status = late ? "LATE" : "PRESENT";

  return { workedMinutes: mins, isLate: late, status };
}

/** "8h 33m" from minutes. */
export function formatWorkedDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Count working days in a month given a weekly-off set.
 * weeklyOff: array of day abbreviations that are off, e.g. ["Sun"].
 */
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function workingDaysInMonth(
  year: number,
  month1to12: number,
  weeklyOff: string[],
): number {
  const offSet = new Set(weeklyOff.map((d) => d.trim()));
  const daysInMonth = new Date(year, month1to12, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month1to12 - 1, day).getDay();
    if (!offSet.has(DAY_ABBR[dow])) count++;
  }
  return count;
}

/** Convert an attendance status into a day fraction for payroll. */
export function dayValueForStatus(status: string): Decimal {
  switch (status) {
    case "PRESENT":
    case "LATE":
      return new Decimal(1);
    case "HALF_DAY":
      return new Decimal(0.5);
    default:
      return new Decimal(0);
  }
}
