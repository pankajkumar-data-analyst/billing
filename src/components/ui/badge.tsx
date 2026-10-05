import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "gold";

const TONES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  gold: "bg-gold/20 text-navy",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Map common statuses to a tone for consistent badges across modules. */
export function statusTone(status: string): Tone {
  const s = status.toUpperCase();
  if (["PAID", "ACTIVE", "APPROVED", "JOINED", "SELECTED", "PRESENT", "REPLACED"].includes(s)) return "success";
  if (["OVERDUE", "CANCELLED", "REJECTED", "ABSENT", "DROPPED", "URGENT", "EXPIRED"].includes(s)) return "danger";
  if (["PARTIALLY_PAID", "ON_HOLD", "PENDING", "LATE", "HALF_DAY", "ON_NOTICE", "EXPIRING_SOON", "REPLACEMENT_REQUIRED"].includes(s)) return "warning";
  if (["SENT", "INTERVIEWING", "INTERVIEW", "SUBMITTED", "PROSPECT", "NEW"].includes(s)) return "info";
  if (["DRAFT"].includes(s)) return "neutral";
  return "neutral";
}
