import { cn } from "@/lib/utils";

/**
 * One2Infinite wordmark. The gold "X" motif mirrors the public site's logo.
 * Uses brand tokens (gold #F4C430 / navy #1a1a2e). The Admin can later upload a
 * custom logo in Settings; this is the default/fallback mark.
 */
export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden>
        <rect x="4" y="20" width="40" height="8" rx="2" fill="#F4C430" transform="rotate(-35 24 24)" />
        <rect x="4" y="20" width="40" height="8" rx="2" fill="#F4C430" transform="rotate(35 24 24)" />
      </svg>
      <span className={cn("leading-tight", dark ? "text-white" : "text-navy")}>
        One2<span className="text-gold-dark">Infinite</span>
      </span>
    </span>
  );
}
