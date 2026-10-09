"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Monthly attendance calendar grid (HR-portal style). Pure presentational:
 * the server passes a map of day -> {status, holidayName} and the weekly-off
 * set. Colour legend matches the status badges used elsewhere.
 */

export interface DayCell {
  status: string | null; // PRESENT / HALF_DAY / SHORT / ABSENT / ON_LEAVE / HOLIDAY / WEEKEND / null
  holidayName?: string | null;
  workedLabel?: string | null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STYLES: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-800 border-green-200",
  LATE: "bg-green-100 text-green-800 border-green-200",
  HALF_DAY: "bg-amber-100 text-amber-800 border-amber-200",
  SHORT: "bg-red-100 text-red-800 border-red-200",
  ABSENT: "bg-red-100 text-red-800 border-red-200",
  ON_LEAVE: "bg-blue-100 text-blue-800 border-blue-200",
  HOLIDAY: "bg-purple-100 text-purple-800 border-purple-200",
  WEEKEND: "bg-secondary text-muted-foreground border-transparent",
};

const LEGEND: [string, string][] = [
  ["Present", "bg-green-100 border-green-200"],
  ["Half Day", "bg-amber-100 border-amber-200"],
  ["Short/Absent", "bg-red-100 border-red-200"],
  ["Leave", "bg-blue-100 border-blue-200"],
  ["Holiday", "bg-purple-100 border-purple-200"],
  ["Weekend", "bg-secondary border-transparent"],
];

export function AttendanceCalendar({
  year,
  month, // 1-12
  days, // key: day number (1..31) -> DayCell
}: {
  year: number;
  month: number;
  days: Record<number, DayCell>;
}) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        {LEGEND.map(([label, cls]) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("inline-block h-3 w-3 rounded border", cls)} /> {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {DOW.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="h-16 rounded-md" />;
          const cell = days[d];
          const style = cell?.status ? STYLES[cell.status] ?? "bg-white border" : "bg-white border";
          return (
            <div key={d} className={cn("h-16 overflow-hidden rounded-md border p-1 text-left", style)} title={cell?.holidayName ?? cell?.status ?? ""}>
              <div className="text-xs font-semibold">{d}</div>
              {cell?.holidayName ? (
                <div className="mt-0.5 truncate text-[9px] leading-tight">{cell.holidayName}</div>
              ) : cell?.status && cell.status !== "WEEKEND" ? (
                <div className="mt-0.5 truncate text-[9px] leading-tight">{labelFor(cell.status)}</div>
              ) : null}
              {cell?.workedLabel ? <div className="truncate text-[9px] text-muted-foreground">{cell.workedLabel}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function labelFor(status: string): string {
  const map: Record<string, string> = {
    PRESENT: "Present", LATE: "Late", HALF_DAY: "Half", SHORT: "Short",
    ABSENT: "Absent", ON_LEAVE: "Leave", HOLIDAY: "Holiday",
  };
  return map[status] ?? status;
}

/** Month/year picker that navigates via query params. */
export function MonthNav({ year, month }: { year: number; month: number }) {
  const [, setBusy] = useState(false);
  const go = (y: number, m: number) => {
    setBusy(true);
    window.location.href = `/attendance?y=${y}&m=${m}`;
  };
  const prev = () => (month === 1 ? go(year - 1, 12) : go(year, month - 1));
  const next = () => (month === 12 ? go(year + 1, 1) : go(year, month + 1));
  return (
    <div className="flex items-center gap-2">
      <button onClick={prev} className="rounded-md border px-2 py-1 text-sm hover:bg-secondary">←</button>
      <span className="min-w-32 text-center text-sm font-medium text-navy">{MONTHS[month - 1]} {year}</span>
      <button onClick={next} className="rounded-md border px-2 py-1 text-sm hover:bg-secondary">→</button>
    </div>
  );
}
