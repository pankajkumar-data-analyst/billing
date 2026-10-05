"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSettings } from "./actions";

type ActionState = { error?: string; ok?: boolean };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : "Save Settings"}</Button>;
}

function F({ name, label, children }: { name: string; label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label>{children}</div>;
}

export function SettingsForm({ defaults }: { defaults: Record<string, unknown> }) {
  const [state, formAction] = useFormState(updateSettings, {} as ActionState);
  const v = (k: string) => (defaults[k] as string | number | undefined) ?? "";

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Settings saved.</p> : null}

      <Card>
        <CardHeader><CardTitle>Company</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <F name="companyName" label="Company Name"><Input id="companyName" name="companyName" defaultValue={v("companyName")} required /></F>
          <F name="website" label="Website"><Input id="website" name="website" defaultValue={v("website")} /></F>
          <F name="phone" label="Phone"><Input id="phone" name="phone" defaultValue={v("phone")} /></F>
          <F name="email" label="Email"><Input id="email" name="email" defaultValue={v("email")} /></F>
          <F name="gstin" label="GSTIN"><Input id="gstin" name="gstin" defaultValue={v("gstin")} /></F>
          <F name="pan" label="PAN"><Input id="pan" name="pan" defaultValue={v("pan")} /></F>
          <div className="md:col-span-2"><F name="address" label="Address"><Textarea id="address" name="address" defaultValue={v("address")} /></F></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bank / Payment Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <F name="bankName" label="Bank Name"><Input id="bankName" name="bankName" defaultValue={v("bankName")} placeholder="[Add your bank]" /></F>
          <F name="bankAccount" label="Account Number"><Input id="bankAccount" name="bankAccount" defaultValue={v("bankAccount")} /></F>
          <F name="bankIfsc" label="IFSC"><Input id="bankIfsc" name="bankIfsc" defaultValue={v("bankIfsc")} /></F>
          <F name="upiId" label="UPI ID"><Input id="upiId" name="upiId" defaultValue={v("upiId")} /></F>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoice Numbering & Defaults</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <F name="invoicePrefix" label="Invoice Prefix"><Input id="invoicePrefix" name="invoicePrefix" defaultValue={v("invoicePrefix")} /></F>
          <F name="nextInvoiceSeq" label="Next Invoice Number"><Input id="nextInvoiceSeq" name="nextInvoiceSeq" type="number" defaultValue={v("nextInvoiceSeq")} /></F>
          <F name="invoiceSeqPadding" label="Number Padding (digits)"><Input id="invoiceSeqPadding" name="invoiceSeqPadding" type="number" defaultValue={v("invoiceSeqPadding")} /></F>
          <F name="defaultPaymentDays" label="Default Payment Days"><Input id="defaultPaymentDays" name="defaultPaymentDays" type="number" defaultValue={v("defaultPaymentDays")} /></F>
          <F name="defaultReplacementDays" label="Default Replacement Days"><Input id="defaultReplacementDays" name="defaultReplacementDays" type="number" defaultValue={v("defaultReplacementDays")} /></F>
          <F name="defaultFeePercent" label="Default Fee %"><Input id="defaultFeePercent" name="defaultFeePercent" type="number" step="0.001" defaultValue={v("defaultFeePercent")} /></F>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="gstEnabled" defaultChecked={!!defaults.gstEnabled} /> Enable GST on invoices
            </label>
          </div>
          <F name="gstRate" label="GST Rate (%)"><Input id="gstRate" name="gstRate" type="number" step="0.001" defaultValue={v("gstRate")} /></F>
          <div className="md:col-span-2"><F name="invoiceFooter" label="Invoice Footer"><Input id="invoiceFooter" name="invoiceFooter" defaultValue={v("invoiceFooter")} /></F></div>
          <div className="md:col-span-2"><F name="invoiceEmailTemplate" label="Invoice Email Template"><Textarea id="invoiceEmailTemplate" name="invoiceEmailTemplate" rows={8} defaultValue={v("invoiceEmailTemplate")} /></F></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Attendance Rules</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <F name="officeStartTime" label="Office Start (HH:mm)"><Input id="officeStartTime" name="officeStartTime" defaultValue={v("officeStartTime")} placeholder="10:00" /></F>
          <F name="officeEndTime" label="Office End (HH:mm)"><Input id="officeEndTime" name="officeEndTime" defaultValue={v("officeEndTime")} placeholder="19:00" /></F>
          <F name="graceMinutes" label="Grace (minutes)"><Input id="graceMinutes" name="graceMinutes" type="number" defaultValue={v("graceMinutes")} /></F>
          <F name="halfDayHours" label="Half-day Threshold (hrs)"><Input id="halfDayHours" name="halfDayHours" type="number" step="0.5" defaultValue={v("halfDayHours")} /></F>
          <F name="fullDayHours" label="Full-day Hours"><Input id="fullDayHours" name="fullDayHours" type="number" step="0.5" defaultValue={v("fullDayHours")} /></F>
          <F name="weeklyOff" label="Weekly Off (e.g. Sun)"><Input id="weeklyOff" name="weeklyOff" defaultValue={v("weeklyOff")} /></F>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Submit /></div>
    </form>
  );
}
