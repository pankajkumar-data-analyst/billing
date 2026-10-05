import { Decimal } from "decimal.js";
import { money, percentOf, toDecimal, type MoneyInput } from "@/lib/money";

/**
 * Recruitment fee calculation — the single source of truth (spec §10, §50).
 *
 * Supports FIXED, PERCENT, TIERED and CUSTOM. Used by placements and the
 * invoice builder so a fee is never computed differently in two places.
 */

export type FeeType = "FIXED" | "PERCENT" | "TIERED" | "CUSTOM";

export interface Tier {
  label: string;
  kind: "FIXED" | "PERCENT";
  value: number; // amount (FIXED) or percent (PERCENT)
  minCtc?: number | null;
  maxCtc?: number | null;
}

export interface FeeInput {
  feeType: FeeType;
  annualCtc: MoneyInput;
  percent?: MoneyInput; // for PERCENT
  fixedAmount?: MoneyInput; // for FIXED
  customAmount?: MoneyInput; // for CUSTOM
  tiers?: Tier[] | null; // for TIERED
}

export interface FeeResult {
  amount: Decimal;
  basis: string; // human-readable explanation for the invoice line
}

/**
 * Resolve the recruitment fee.
 * Example: PERCENT 6% of ₹6,00,000 => ₹36,000.
 *          FIXED ₹15,000 => ₹15,000.
 */
export function calculateRecruitmentFee(input: FeeInput): FeeResult {
  const annual = toDecimal(input.annualCtc);

  switch (input.feeType) {
    case "FIXED": {
      const amount = money(input.fixedAmount ?? 0);
      return { amount, basis: `Fixed fee of ${amount.toFixed(2)}` };
    }

    case "PERCENT": {
      const pct = toDecimal(input.percent ?? 0);
      const amount = percentOf(annual, pct);
      return {
        amount,
        basis: `${pct.toString()}% of annual CTC ${annual.toFixed(2)}`,
      };
    }

    case "CUSTOM": {
      const amount = money(input.customAmount ?? 0);
      return { amount, basis: `Custom fee of ${amount.toFixed(2)}` };
    }

    case "TIERED": {
      const tier = pickTier(input.tiers ?? [], annual);
      if (!tier) {
        return { amount: new Decimal(0), basis: "No matching tier" };
      }
      if (tier.kind === "FIXED") {
        const amount = money(tier.value);
        return { amount, basis: `Tier "${tier.label}": fixed ${amount.toFixed(2)}` };
      }
      const amount = percentOf(annual, tier.value);
      return {
        amount,
        basis: `Tier "${tier.label}": ${tier.value}% of ${annual.toFixed(2)}`,
      };
    }

    default:
      return { amount: new Decimal(0), basis: "Unknown fee type" };
  }
}

/** Pick the first tier whose CTC band contains the annual CTC. */
function pickTier(tiers: Tier[], annual: Decimal): Tier | null {
  for (const t of tiers) {
    const min = t.minCtc != null ? new Decimal(t.minCtc) : null;
    const max = t.maxCtc != null ? new Decimal(t.maxCtc) : null;
    const aboveMin = min === null || annual.greaterThanOrEqualTo(min);
    const belowMax = max === null || annual.lessThanOrEqualTo(max);
    if (aboveMin && belowMax) return t;
  }
  return tiers.length > 0 ? tiers[0] : null;
}
