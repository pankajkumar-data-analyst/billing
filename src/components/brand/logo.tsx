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

  // Clean text wordmark (used while a final logo image is pending).
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className={cn("text-lg font-bold tracking-tight", dark ? "text-white" : "text-navy")}>
        One2<span className="text-gold">Infinite</span>
      </span>
      <span className={cn("text-[10px] font-medium uppercase tracking-widest", dark ? "text-white/60" : "text-muted-foreground")}>
        Recruitment Solutions
      </span>
    </span>
  );
}
