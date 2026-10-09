import { prisma } from "@/lib/prisma";

/**
 * Holiday helpers. Supports fixed-date holidays and recurring ones (same
 * month+day every year). Used by the attendance calendar and payroll working-
 * day counting.
 */

function key(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Map of holidays that fall within a given month (year, month 1-12).
 * Key = "yyyy-mm-dd", value = holiday name. Recurring holidays match by
 * month+day regardless of year.
 */
export async function holidaysInMonth(year: number, month1to12: number): Promise<Map<string, string>> {
  const all = await prisma.holiday.findMany();
  const map = new Map<string, string>();
  const m0 = month1to12 - 1;
  const daysInMonth = new Date(year, month1to12, 0).getDate();

  for (const hol of all) {
    const hy = hol.date.getFullYear();
    const hm = hol.date.getMonth();
    const hd = hol.date.getDate();
    if (hol.recurring) {
      // Match month+day in the requested year.
      if (hm === m0 && hd <= daysInMonth) map.set(key(year, m0, hd), hol.name);
    } else if (hy === year && hm === m0) {
      map.set(key(year, m0, hd), hol.name);
    }
  }
  return map;
}

/** Count holidays that fall on working days (not weekends) in a month. */
export async function workingDayHolidayCount(
  year: number,
  month1to12: number,
  weeklyOff: string[],
): Promise<number> {
  const map = await holidaysInMonth(year, month1to12);
  const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const offSet = new Set(weeklyOff.map((d) => d.trim()));
  let count = 0;
  for (const dateStr of map.keys()) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (!offSet.has(DAY_ABBR[dow])) count++;
  }
  return count;
}
