import { Decimal } from "decimal.js";
import { add, money, percentOf, subtract, sum, toDecimal, gte, type MoneyInput } from "@/lib/money";

/**
 * Invoice totals, status and numbering — centralized (spec §11-§14, §50).
 */

export interface InvoiceLine {
  amount: MoneyInput;
}

export interface InvoiceTotals {
  subtotal: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  total: Decimal;
}

/**
 * Compute subtotal/tax/total. GST is disabled by default: pass taxRate = 0
 * (or omit) and taxAmount is 0. Enabling GST later = pass a non-zero rate;
 * no other code changes needed (spec §5 GST-ready requirement).
 */
export function computeInvoiceTotals(
  lines: InvoiceLine[],
  taxRate: MoneyInput = 0,
): InvoiceTotals {
  const subtotal = sum(lines.map((l) => l.amount));
  const rate = toDecimal(taxRate);
  const taxAmount = rate.isZero() ? new Decimal(0) : percentOf(subtotal, rate);
  const total = add(subtotal, taxAmount);
  return { subtotal, taxRate: rate, taxAmount, total };
}

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

/**
 * Derive the correct status from amounts + due date.
 * CANCELLED is terminal and never recomputed here.
 * Precedence: fully paid => PAID; part paid => PARTIALLY_PAID;
 *             else overdue if past due date; else keep sent/draft.
 */
export function deriveInvoiceStatus(params: {
  current: InvoiceStatus;
  total: MoneyInput;
  amountPaid: MoneyInput;
  dueDate: Date;
  now?: Date;
}): InvoiceStatus {
  const { current } = params;
  if (current === "CANCELLED") return "CANCELLED";

  const total = money(params.total);
  const paid = money(params.amountPaid);
  const now = params.now ?? new Date();

  if (gte(paid, total) && !total.isZero()) return "PAID";
  if (paid.greaterThan(0)) {
    // partially paid; still flag overdue if past due
    return "PARTIALLY_PAID";
  }
  // nothing paid
  if (now > endOfDay(params.dueDate)) return "OVERDUE";
  // not paid, not overdue — preserve DRAFT vs SENT
  return current === "DRAFT" ? "DRAFT" : "SENT";
}

export function outstanding(total: MoneyInput, amountPaid: MoneyInput): Decimal {
  const o = subtract(total, amountPaid);
  return o.isNegative() ? new Decimal(0) : o;
}

/** Build the next invoice number from settings, e.g. OI-2026-0001. */
export function buildInvoiceNumber(params: {
  prefix: string;
  year: number;
  seq: number;
  padding: number;
}): string {
  const seqStr = String(params.seq).padStart(params.padding, "0");
  return `${params.prefix}-${params.year}-${seqStr}`;
}

/** Due date = invoice date + N days. */
export function computeDueDate(invoiceDate: Date, paymentDueDays: number): Date {
  const d = new Date(invoiceDate);
  d.setDate(d.getDate() + paymentDueDays);
  return d;
}

function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}
