import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { getSettings } from "@/lib/services/settings";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "./settings-form";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const s = await getSettings();
  const defaults = {
    companyName: s.companyName, address: s.address, phone: s.phone, email: s.email, website: s.website,
    gstin: s.gstin, pan: s.pan, bankName: s.bankName, bankAccount: s.bankAccount, bankIfsc: s.bankIfsc, upiId: s.upiId,
    invoicePrefix: s.invoicePrefix, nextInvoiceSeq: s.nextInvoiceSeq, invoiceSeqPadding: s.invoiceSeqPadding,
    gstEnabled: s.gstEnabled, gstRate: s.gstRate.toString(),
    defaultPaymentDays: s.defaultPaymentDays, defaultReplacementDays: s.defaultReplacementDays,
    defaultFeePercent: s.defaultFeePercent.toString(), invoiceFooter: s.invoiceFooter, invoiceEmailTemplate: s.invoiceEmailTemplate,
    officeStartTime: s.officeStartTime, officeEndTime: s.officeEndTime, graceMinutes: s.graceMinutes,
    halfDayHours: s.halfDayHours.toString(), fullDayHours: s.fullDayHours.toString(), weeklyOff: s.weeklyOff,
  };
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Company, bank, invoice numbering, GST and attendance rules — all configurable here."
        action={<Link href="/settings/audit" className={buttonVariants({ variant: "outline" })}>View Audit Log</Link>}
      />
      <SettingsForm defaults={defaults} />
    </div>
  );
}
