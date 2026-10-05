/** Human-readable labels for enums, shared across modules. */

export function feeTypeLabel(t: string): string {
  return (
    { FIXED: "Fixed Fee", PERCENT: "Percentage", TIERED: "Tiered", CUSTOM: "Custom" } as Record<string, string>
  )[t] ?? t;
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const PIPELINE_STAGES = [
  "SOURCED", "SCREENED", "SHORTLISTED", "SUBMITTED", "INTERVIEW",
  "SELECTED", "OFFER", "JOINED", "REJECTED", "DROPPED",
  "REPLACEMENT_REQUIRED", "REPLACED",
] as const;

export const JOB_STATUSES = [
  "NEW", "ACTIVE", "ON_HOLD", "SUBMITTED", "INTERVIEWING", "FILLED", "CLOSED", "CANCELLED",
] as const;

export const PAYMENT_MODES = ["BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "OTHER"] as const;
export const LEAVE_TYPES = ["CASUAL", "SICK", "PAID", "UNPAID", "OTHER"] as const;
