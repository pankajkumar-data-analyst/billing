/**
 * Minimal, dependency-free CSV builder. Properly escapes quotes, commas and
 * newlines per RFC 4180. Used by the Admin-only export routes.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined): string => {
    const str = v === null || v === undefined ? "" : String(v);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) lines.push(row.map(esc).join(","));
  // Prepend BOM so Excel opens UTF-8 (₹, etc.) correctly.
  return "\uFEFF" + lines.join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
