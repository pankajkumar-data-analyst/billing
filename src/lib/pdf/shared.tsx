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

let fontsRegistered = false;
export function ensureFonts() {
  if (fontsRegistered) return;
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: path.join(dir, "NotoSans-Regular.ttf") },
      { src: path.join(dir, "NotoSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
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

// Resolve the owner's transparent PNG logo once at module load.
const LOGO_FILE = (() => {
  const candidates = [
    path.join(process.cwd(), "public", "One2infinite logo-600kb.png"),
    path.join(process.cwd(), "public", "logo.png"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
})();

/** Logo mark: real transparent PNG when present, else gold vector "X". */
export function LogoMark({ size = 60 }: { size?: number }) {
  if (LOGO_FILE) {
    return <Image src={LOGO_FILE} style={{ width: size, height: size, objectFit: "contain" }} />;
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
  page: { paddingTop: 0, paddingBottom: 40, fontSize: 10, color: "#333", fontFamily: "NotoSans" },
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
