import { prisma } from "@/lib/prisma";
import { buildInvoiceNumber } from "@/lib/services/invoice";
import type { Prisma } from "@prisma/client";

/**
 * Allocate the next invoice number atomically (spec §11: sequential,
 * configurable, not manipulable by employees).
 *
 * Runs inside a transaction and increments `nextInvoiceSeq` on the settings
 * singleton so two concurrent invoice creations can never get the same number.
 * MUST be called within a Prisma transaction (pass the tx client).
 */
export async function allocateInvoiceNumber(
  tx: Prisma.TransactionClient,
  invoiceDate: Date,
): Promise<string> {
  const settings = await tx.companySettings.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    throw new Error("Company settings not initialized");
  }
  const seq = settings.nextInvoiceSeq;
  const number = buildInvoiceNumber({
    prefix: settings.invoicePrefix,
    year: invoiceDate.getFullYear(),
    seq,
    padding: settings.invoiceSeqPadding,
  });
  await tx.companySettings.update({
    where: { id: "singleton" },
    data: { nextInvoiceSeq: seq + 1 },
  });
  return number;
}

export { prisma };
