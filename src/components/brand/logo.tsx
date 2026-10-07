import { cn } from "@/lib/utils";

/**
 * One2Infinite brand logo.
 *
 * The real logo is a dark/black-background JPEG the owner provided
 * (public/"One2infinite logo-600kb.jpeg"). Because it has a black background it
 * is used only on dark surfaces (sidebar, login card header) where it blends
 * in. On light surfaces (and the white invoice PDF) we fall back to the vector
 * wordmark so nothing shows an ugly black box.
 *
 * `variant`:
 *   - "image"    → the actual logo image (use on dark backgrounds)
 *   - "wordmark" → the gold "X" + "One2Infinite" text (use on light backgrounds)
 */

// The file name contains spaces and capitals, so it must be URL-encoded.
export const LOGO_SRC = "/One2infinite%20logo-600kb.jpeg";

export function Logo({
  className,
  dark = false,
  variant = "wordmark",
}: {
  className?: string;
  dark?: boolean;
  variant?: "image" | "wordmark";
}) {
  if (variant === "image") {
    return (
      // Plain <img> (not next/image) so it works for a file with spaces in the
      // name without extra config. The logo already contains the company name.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_SRC}
        alt="One2Infinite Recruitment Solutions"
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
