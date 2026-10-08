import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";
import { Decimal } from "decimal.js";
import type { Prisma, LeaveType } from "@prisma/client";

/**
 * Leave-balance helpers (spec §19).
 *
 * Balances are tracked per employee, per calendar year, per leave type. Paid
 * types (CASUAL/SICK/PAID) draw down an allocated quota; UNPAID/OTHER are not
 * quota-limited (they only affect payroll as LOP), so they are not deducted.
 */

const QUOTA_TYPES: LeaveType[] = ["CASUAL", "SICK", "PAID"];

export function isQuotaType(type: LeaveType): boolean {
  return QUOTA_TYPES.includes(type);
}

/** Ensure the three quota rows exist for an employee+year, seeded from settings. */
export async function ensureBalances(employeeId: string, year: number) {
  const settings = await getSettings();
  const quotas: Record<string, Decimal> = {
    CASUAL: new Decimal(settings.leaveQuotaCasual.toString()),
    SICK: new Decimal(settings.leaveQuotaSick.toString()),
    PAID: new Decimal(settings.leaveQuotaPaid.toString()),
  };
  for (const type of QUOTA_TYPES) {
    await prisma.leaveBalance.upsert({
      where: { employeeId_year_type: { employeeId, year, type } },
      update: {},
      create: { employeeId, year, type, allocated: quotas[type].toFixed(1), used: "0.0" },
    });
  }
}

/** Get all balances for an employee+year (ensures they exist first). */
export async function getBalances(employeeId: string, year: number) {
  await ensureBalances(employeeId, year);
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    orderBy: { type: "asc" },
  });
}

/** Apply (deduct) or restore (refund) usage for a leave request, inside a tx. */
export async function adjustUsage(
  tx: Prisma.TransactionClient,
  params: { employeeId: string; year: number; type: LeaveType; days: Decimal; direction: "deduct" | "restore" },
) {
  if (!isQuotaType(params.type)) return; // unpaid/other: no quota impact
  const existing = await tx.leaveBalance.findUnique({
    where: { employeeId_year_type: { employeeId: params.employeeId, year: params.year, type: params.type } },
  });
  // If somehow missing, create with 0 allocated (admin can adjust later).
  const used = new Decimal(existing?.used.toString() ?? "0");
  const next =
    params.direction === "deduct" ? used.plus(params.days) : Decimal.max(new Decimal(0), used.minus(params.days));
  await tx.leaveBalance.upsert({
    where: { employeeId_year_type: { employeeId: params.employeeId, year: params.year, type: params.type } },
    update: { used: next.toFixed(1) },
    create: { employeeId: params.employeeId, year: params.year, type: params.type, allocated: "0.0", used: next.toFixed(1) },
  });
}
