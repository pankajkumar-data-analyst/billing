/**
 * Replacement-guarantee date logic (spec §24, §50).
 */

export interface GuaranteeDates {
  start: Date;
  end: Date;
  days: number;
}

/** Guarantee runs for `days` from the joining date. */
export function computeGuarantee(joiningDate: Date, days: number): GuaranteeDates {
  const start = new Date(joiningDate);
  const end = new Date(joiningDate);
  end.setDate(end.getDate() + days);
  return { start, end, days };
}

export type GuaranteeState =
  | "WITHIN_GUARANTEE"
  | "EXPIRING_SOON" // within 7 days of end
  | "EXPIRES_TOMORROW"
  | "EXPIRED";

/** Classify where a guarantee stands relative to `now`. */
export function guaranteeState(end: Date | null, now: Date = new Date()): GuaranteeState | "NA" {
  if (!end) return "NA";
  const endEod = new Date(end);
  endEod.setHours(23, 59, 59, 999);

  const msLeft = endEod.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (msLeft < 0) return "EXPIRED";
  if (daysLeft <= 1) return "EXPIRES_TOMORROW";
  if (daysLeft <= 7) return "EXPIRING_SOON";
  return "WITHIN_GUARANTEE";
}
