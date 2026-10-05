import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { ClientForm } from "../../client-form";
import { updateClient } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.CLIENT_MANAGE);
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { terms: true, contacts: { where: { isPrimary: true }, take: 1 } },
  });
  if (!client) notFound();

  const contact = client.contacts[0];
  const defaults = {
    name: client.name, type: client.type, industry: client.industry, website: client.website,
    address: client.address, city: client.city, state: client.state, gstin: client.gstin, pan: client.pan,
    billingAddress: client.billingAddress, agreementStatus: client.agreementStatus, notes: client.notes,
    status: client.status,
    contactName: contact?.name, contactDesignation: contact?.designation,
    contactEmail: contact?.email, contactPhone: contact?.phone, contactWhatsapp: contact?.whatsapp,
    feeType: client.terms?.feeType, percent: client.terms?.percent?.toString(),
    fixedAmount: client.terms?.fixedAmount?.toString(),
    paymentDueDays: client.terms?.paymentDueDays, replacementDays: client.terms?.replacementDays,
    agreementRef: client.terms?.agreementRef,
  };

  const action = updateClient.bind(null, client.id);

  return (
    <div>
      <PageHeader title={`Edit ${client.name}`} />
      <ClientForm action={action} defaults={defaults} submitLabel="Save Changes" />
    </div>
  );
}
