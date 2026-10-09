import React from "react";
import path from "path";
import fs from "fs";
import { StyleSheet, Font, Svg, Rect, Image } from "@react-pdf/renderer";

/**
 * Shared PDF helpers used by both the invoice and payslip documents:
 *  - Noto Sans registration (so ₹ and other glyphs render; Helvetica can't)
 *  - nl(): breaks f-ligatures + normalises dashes so text stays correct
 *  - LogoMark: the real transparent PNG logo (fallback: gold vector "X")
 *  - brand colours
 */

export const NAVY = "#1a1a2e";
export const GOLD = "#D4A017";
export const MUTED = "#777777";

// Find a bundled file across the paths it may live at on dev vs. Vercel.
function findFile(relPaths: string[]): string | null {
  for (const rel of relPaths) {
    const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
    try {
      if (fs.existsSync(abs)) return abs;
    } catch {
      /* ignore */
    }
  }
  return null;
}

let fontsRegistered = false;
/** The font family to use ("NotoSans" if registered, else built-in Helvetica). */
export let FONT_FAMILY = "Helvetica";

export function ensureFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true; // only attempt once

  const reg = findFile([
    "src/lib/pdf/fonts/NotoSans-Regular.ttf",
    "lib/pdf/fonts/NotoSans-Regular.ttf",
    ".next/server/src/lib/pdf/fonts/NotoSans-Regular.ttf",
  ]);
  const bold = findFile([
    "src/lib/pdf/fonts/NotoSans-Bold.ttf",
    "lib/pdf/fonts/NotoSans-Bold.ttf",
    ".next/server/src/lib/pdf/fonts/NotoSans-Bold.ttf",
  ]);

  if (reg && bold) {
    // @react-pdf v4's font loader reads a string `src` as a filesystem path on
    // Node. We resolve the file to an ABSOLUTE path (findFile already did) and
    // register that — the most reliable method on Vercel's serverless Node
    // runtime, provided the .ttf is traced into the bundle
    // (next.config outputFileTracingIncludes). As a last resort we fall back to
    // a base64 data-URI, then to built-in Helvetica.
    const tryRegister = (regSrc: string, boldSrc: string): boolean => {
      try {
        Font.register({
          family: "NotoSans",
          fonts: [
            { src: regSrc },
            { src: boldSrc, fontWeight: "bold" },
          ],
        });
        Font.registerHyphenationCallback((word) => [word]);
        return true;
      } catch {
        return false;
      }
    };

    const toDataUri = (p: string) =>
      `data:font/ttf;base64,${fs.readFileSync(p).toString("base64")}`;

    let ok = tryRegister(reg, bold);
    if (!ok) {
      try {
        ok = tryRegister(toDataUri(reg), toDataUri(bold));
      } catch {
        ok = false;
      }
    }
    FONT_FAMILY = ok ? "NotoSans" : "Helvetica"; // fall back; PDF still renders
  }
}

/**
 * Break OpenType ligatures (fi/ffi/fl/ff) with a zero-width non-joiner and
 * normalise em/en dashes to a plain hyphen.
 */
export function nl(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/f(?=[fil])/g, "f\u200C");
}

// Resolve the logo once, as a base64 data-URI (most reliable for @react-pdf
// Image on serverless — avoids any filesystem path lookup at render time).
const LOGO_DATA_URI = (() => {
  const file = findFile(["public/One2infinite logo-600kb.png", "public/logo.png"]);
  if (!file) return null;
  try {
    const b64 = fs.readFileSync(file).toString("base64");
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
})();

/** Logo mark: real transparent PNG when present, else gold vector "X". */
export function LogoMark({ size = 60 }: { size?: number }) {
  if (LOGO_DATA_URI) {
    return <Image src={LOGO_DATA_URI} style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  return (
    <Svg width={size * 0.57} height={size * 0.57} viewBox="0 0 48 48">
      <Rect x={4} y={21} width={40} height={8} rx={2} fill={GOLD} transform="rotate(-38 24 24)" />
      <Rect x={4} y={21} width={40} height={8} rx={2} fill={GOLD} transform="rotate(38 24 24)" />
    </Svg>
  );
}

/** Shared header-band + body styles so both documents look consistent. */
export const sharedStyles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 40, fontSize: 10, color: "#333" },
  bodyPad: { paddingHorizontal: 40 },
  headerBand: {
    backgroundColor: NAVY,
    paddingHorizontal: 40,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  logoText: { marginLeft: 12 },
  companyName: { fontSize: 15, fontWeight: "bold", color: "#ffffff" },
  companyMutedOnDark: { color: "#c9c9d4", fontSize: 8, marginTop: 1 },
  docTitle: { fontSize: 22, fontWeight: "bold", color: GOLD, textAlign: "right" },
  docSubtitle: { fontSize: 9, color: GOLD, fontWeight: "bold", textAlign: "right", marginTop: 4 },
  footer: {
    position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center",
    color: MUTED, fontSize: 9, borderTop: "1px solid #e9ecef", paddingTop: 8,
  },
});
