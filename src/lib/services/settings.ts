import { prisma } from "@/lib/prisma";

/**
 * Company settings accessor. Guarantees the singleton row exists (creates it
 * with schema defaults on first access) so no company/bank/invoice value is
 * ever hardcoded in the app — everything is read from here.
 */
export async function getSettings() {
  const existing = await prisma.companySettings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.companySettings.create({ data: { id: "singleton" } });
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;
