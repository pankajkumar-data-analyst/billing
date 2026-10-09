import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * One2Infinite brand logo.
 *
 * The real logo is a TRANSPARENT PNG the owner provided
 * (public/"One2infinite logo-600kb.png"). It is served through next/image so
 * Next resizes/compresses it to the actual display size and modern format
 * (WebP) on demand — the full 600KB/1254px source is never shipped to the
 * browser. Default variant is "image" so the real logo is always used.
 *
 * `variant`:
 *   - "image"    → the actual logo image (optimized via next/image)
 *   - "wordmark" → the gold "X" + "One2Infinite" text fallback
 */

// Transparent PNG logo. The file name contains a space, so it must be
// URL-encoded for use as a src.
export const LOGO_SRC = "/One2infinite%20logo-600kb.png";

export function Logo({
  className,
  dark = false,
  variant = "image",
  size = 112,
}: {
  className?: string;
  dark?: boolean;
  variant?: "image" | "wordmark";
  size?: number;
}) {
  if (variant === "image") {
    return (
      <Image
        src={LOGO_SRC}
        alt="One2Infinite Recruitment Solutions"
        width={size}
        height={size}
        priority
        className={cn("h-auto w-auto object-contain", className)}
      />
    );
  }

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
