import { prisma } from "@/lib/prisma";

/**
 * Login brute-force protection (spec §29). Account-level lockout backed by the
 * users table: after MAX_ATTEMPTS failures the account is locked for
 * LOCK_MINUTES. This is durable across serverless invocations (unlike an
 * in-memory limiter), which matters on Vercel.
 *
 * NOTE: This is per-account. An additional per-IP edge limit (e.g. Vercel
 * Firewall / Upstash) is recommended in production and documented in the README.
 */

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export function isLocked(lockedUntil: Date | null): boolean {
  return !!lockedUntil && lockedUntil.getTime() > Date.now();
}

export async function registerFailedAttempt(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const count = user.failedLoginCount + 1;
  const data: { failedLoginCount: number; lockedUntil?: Date } = {
    failedLoginCount: count,
  };
  if (count >= MAX_ATTEMPTS) {
    data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
  }
  await prisma.user.update({ where: { id: userId }, data });
}

export async function registerSuccessfulLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}
