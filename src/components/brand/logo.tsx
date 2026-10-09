import { cn } from "@/lib/utils";

/**
 * One2Infinite brand wordmark (text only).
 *
 * The image logo was removed per the owner's request — a clean, readable text
 * wordmark is used instead until a final logo asset is provided. `subtitle`
 * lets a surface label itself (e.g. "Business Portal", "HR Portal").
 */
export function Logo({
  className,
  dark = false,
  subtitle = "Business Portal",
}: {
  className?: string;
  dark?: boolean;
  subtitle?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className={cn("text-xl font-extrabold tracking-tight", dark ? "text-white" : "text-navy")}>
        One2<span className="text-gold">Infinite</span>
      </span>
      <span className={cn("mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]", dark ? "text-gold/80" : "text-gold-dark")}>
        {subtitle}
      </span>
    </span>
  );
}
