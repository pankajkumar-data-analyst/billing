import { Decimal } from "decimal.js";

/**
 * Decimal-safe money helpers.
 *
 * All monetary math in this app goes through Decimal — never native JS
 * floating-point. Prisma returns Decimal for NUMERIC columns; these helpers
 * normalise inputs (number | string | Prisma.Decimal) into decimal.js and
 * back, rounding to 2 places (paise) only at the boundary.
 */

// Round half-up at 2 decimal places (standard currency rounding).
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = number | string | Decimal | { toString(): string } | null | undefined;

export function toDecimal(value: MoneyInput): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  if (value instanceof Decimal) return value;
  if (typeof value === "number" || typeof value === "string") return new Decimal(value);
  // Prisma.Decimal and similar expose toString()
  return new Decimal(value.toString());
}

/** Round to 2 decimal places. */
export function money(value: MoneyInput): Decimal {
  return toDecimal(value).toDecimalPlaces(2);
}

export function add(a: MoneyInput, b: MoneyInput): Decimal {
  return money(toDecimal(a).plus(toDecimal(b)));
}

export function subtract(a: MoneyInput, b: MoneyInput): Decimal {
  return money(toDecimal(a).minus(toDecimal(b)));
}

export function multiply(a: MoneyInput, b: MoneyInput): Decimal {
  return money(toDecimal(a).times(toDecimal(b)));
}

/** percentOf(600000, 6) => 36000.00 */
export function percentOf(amount: MoneyInput, percent: MoneyInput): Decimal {
  return money(toDecimal(amount).times(toDecimal(percent)).dividedBy(100));
}

export function sum(values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0)).toDecimalPlaces(2);
}

export function isZero(value: MoneyInput): boolean {
  return toDecimal(value).isZero();
}

export function gte(a: MoneyInput, b: MoneyInput): boolean {
  return toDecimal(a).greaterThanOrEqualTo(toDecimal(b));
}

export function lte(a: MoneyInput, b: MoneyInput): boolean {
  return toDecimal(a).lessThanOrEqualTo(toDecimal(b));
}

/** For writing back to Prisma Decimal columns — plain string, 2 dp. */
export function toDbString(value: MoneyInput): string {
  return money(value).toFixed(2);
}

/** Indian-format currency for display, e.g. 3,60,000.00 */
export function formatINR(value: MoneyInput, withSymbol = true): string {
  const n = money(value).toNumber();
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return withSymbol ? `₹${formatted}` : formatted;
}

/** Compact INR for KPI cards, e.g. ₹3.6L, ₹1.2Cr */
export function formatINRCompact(value: MoneyInput): string {
  const n = money(value).toNumber();
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}
