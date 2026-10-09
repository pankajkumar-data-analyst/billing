import { Decimal } from "decimal.js";
import { money, multiply, subtract, add, toDecimal, type MoneyInput } from "@/lib/money";

/**
 * Basic payroll calculation (spec §20). Phase 1 scope: compute pay for a month
 * from monthly salary, working days, present days and leave. No bank transfers,
 * no statutory PF/ESI/TDS engine (documented as Phase 2+).
 *
 * LOP (Loss of Pay) = unpaid-leave + absent days, valued at per-day salary.
 * Net = gross - LOP - deductions + bonus.
 */

export interface PayrollInput {
  monthlySalary: MoneyInput;
  workingDays: number; // working days in the month (per calendar + weekly-off)
  presentDays: MoneyInput; // sum of day-values from attendance (incl. 0.5 halves)
  paidLeaveDays?: MoneyInput;
  unpaidLeaveDays?: MoneyInput;
  bonus?: MoneyInput;
  deductions?: MoneyInput; // advances/other deductions
}

export interface PayrollResult {
  workingDays: number;
  presentDays: Decimal;
  paidLeave: Decimal;
  unpaidLeave: Decimal;
  lopDays: Decimal;
  perDaySalary: Decimal;
  grossSalary: Decimal;
  lopAmount: Decimal;
  bonus: Decimal;
  deductions: Decimal;
  netSalary: Decimal;
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const gross = money(input.monthlySalary);
  const workingDays = Math.max(1, input.workingDays); // avoid /0
  const present = toDecimal(input.presentDays ?? 0);
  const paidLeave = toDecimal(input.paidLeaveDays ?? 0);
  const unpaidLeave = toDecimal(input.unpaidLeaveDays ?? 0);
  const bonus = money(input.bonus ?? 0);
  const deductions = money(input.deductions ?? 0);

  // Days accounted as paid = present + paid leave (capped at working days).
  // The rest of the month's working days are Loss of Pay.
  let paidDays = present.plus(paidLeave);
  if (paidDays.greaterThan(workingDays)) paidDays = new Decimal(workingDays);
  let lopDays = new Decimal(workingDays).minus(paidDays);
  if (lopDays.isNegative()) lopDays = new Decimal(0);

  const perDay = gross.dividedBy(workingDays).toDecimalPlaces(2);

  // Compute LOP as (gross - earned) rather than (perDay * lopDays), so rounding
  // can never make LOP exceed gross. Earned pay is proportional to paid days;
  // if there are zero paid days, earned = 0 and LOP = gross exactly.
  const earned = money(gross.times(paidDays).dividedBy(workingDays));
  let lopAmount = subtract(gross, earned);
  if (lopAmount.isNegative()) lopAmount = new Decimal(0);

  const net = add(subtract(earned, deductions), bonus);

  return {
    workingDays,
    presentDays: present,
    paidLeave,
    unpaidLeave,
    lopDays,
    perDaySalary: perDay,
    grossSalary: gross,
    lopAmount,
    bonus,
    deductions,
    netSalary: net.isNegative() ? new Decimal(0) : net,
  };
}
