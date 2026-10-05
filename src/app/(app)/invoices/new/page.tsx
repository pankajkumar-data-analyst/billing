import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";
import { computeDueDate } from "@/lib/services/invoice";
import { PageHeader } from "@/components/app/page-header";
import { InvoiceForm, type InvoiceDefaults } from "../invoice-form";
import { createInvoice } from "../actions";

export const dynamic = "force-dynamic";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function NewInvoicePage({ searchParams }: { searchParams: { placementId?: string } }) {
  await requirePermission(PERMISSIONS.INVOICE_CREATE);
  const settings = await getSettings();

  let defaults: InvoiceDefaults = {
    clientId: "",
    invoiceDate: iso(new Date()),
    dueDate: iso(computeDueDate(new Date(), settings.defaultPaymentDays)),
    clientNameSnapshot: "",
    description: "Recruitment service fee",
    paymentTerms: settings.defaultPaymentTerms ?? `Payment due within ${settings.defaultPaymentDays} days`,
    replacementTerms: settings.defaultReplacementText ?? `${settings.defaultReplacementDays}-day replacement guarantee`,
    bankDetailsSnapshot: [
      settings.bankName ? `Bank: ${settings.bankName}` : null,
      settings.bankAccount ? `A/C: ${settings.bankAccount}` : null,
      settings.bankIfsc ? `IFSC: ${settings.bankIfsc}` : null,
      settings.upiId ? `UPI: ${settings.upiId}` : null,
    ].filter(Boolean).join("\n") || "[Add bank details in Settings]",
  };

  // Prefill from a placement when provided (spec §11 auto-populate).
  if (searchParams.placementId) {
    const p = await prisma.placement.findUnique({
      where: { id: searchParams.placementId },
      include: { candidate: true, client: { include: { contacts: { where: { isPrimary: true }, take: 1 }, terms: true } }, job: true },
    });
    if (p) {
      const contact = p.client.contacts[0];
      const invoiceDate = new Date();
      const dueDays = p.client.terms?.paymentDueDays ?? settings.defaultPaymentDays;
      defaults = {
        ...defaults,
        clientId: p.clientId,
        placementId: p.id,
        invoiceDate: iso(invoiceDate),
        dueDate: iso(computeDueDate(invoiceDate, dueDays)),
        clientNameSnapshot: p.client.name,
        clientAddressSnapshot: p.client.billingAddress ?? p.client.address ?? "",
        contactPerson: contact?.name ?? "",
        contactEmail: contact?.email ?? "",
        contactPhone: contact?.phone ?? "",
        description: `Recruitment fee — placement of ${p.candidate.fullName} as ${p.job.title}`,
        candidateName: p.candidate.fullName,
        jobTitle: p.job.title,
        joiningDate: iso(p.joiningDate),
        ctc: p.annualCtc.toString(),
        feePercent: p.feePercent?.toString(),
        amount: p.calculatedFee.toString(),
        replacementTerms: `${p.guaranteeDays}-day replacement guarantee from joining date`,
      };
    }
  }

  return (
    <div>
      <PageHeader title="New Invoice" subtitle="Review and edit before creating. Nothing is sent automatically." />
      <InvoiceForm action={createInvoice} defaults={defaults} gstEnabled={settings.gstEnabled} gstRate={Number(settings.gstRate)} />
    </div>
  );
}
