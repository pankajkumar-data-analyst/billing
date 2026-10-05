import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { currentUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { getSettings } from "@/lib/services/settings";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";

/**
 * GET /invoices/:id/pdf — stream the invoice as a PDF.
 * Authorization enforced server-side: must have INVOICE_VIEW. The PDF is never
 * exposed on a public/unauthenticated URL.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || !hasPermission(user, PERMISSIONS.INVOICE_VIEW)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: params.id }, include: { items: true } }),
    getSettings(),
  ]);
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const buffer = await renderToBuffer(
    InvoicePdf({
      company: {
        name: settings.companyName, address: settings.address, phone: settings.phone,
        email: settings.email, website: settings.website, gstin: settings.gstin, pan: settings.pan,
      },
      invoice: {
        number: invoice.number, status: invoice.status, invoiceDate: invoice.invoiceDate, dueDate: invoice.dueDate,
        clientName: invoice.clientNameSnapshot, clientAddress: invoice.clientAddressSnapshot,
        contactPerson: invoice.contactPerson, contactEmail: invoice.contactEmail, contactPhone: invoice.contactPhone,
        subtotal: invoice.subtotal.toString(), taxRate: invoice.taxRate.toString(),
        taxAmount: invoice.taxAmount.toString(), total: invoice.total.toString(),
        paymentTerms: invoice.paymentTerms, replacementTerms: invoice.replacementTerms,
        bankDetails: invoice.bankDetailsSnapshot, notes: invoice.notes,
        footer: settings.invoiceFooter ?? "Thank you for your business.",
        gstEnabled: settings.gstEnabled,
        items: invoice.items.map((it) => ({
          description: it.description, candidateName: it.candidateName, jobTitle: it.jobTitle,
          joiningDate: it.joiningDate, ctc: it.ctc?.toString() ?? null, amount: it.amount.toString(),
        })),
      },
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
