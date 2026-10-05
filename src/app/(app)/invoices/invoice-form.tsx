"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

export interface InvoiceDefaults {
  clientId: string;
  placementId?: string;
  invoiceDate: string; // yyyy-mm-dd
  dueDate: string;
  clientNameSnapshot: string;
  clientAddressSnapshot?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  description: string;
  candidateName?: string;
  jobTitle?: string;
  joiningDate?: string;
  ctc?: string;
  feePercent?: string;
  amount?: string;
  paymentTerms?: string;
  replacementTerms?: string;
  bankDetailsSnapshot?: string;
  notes?: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Creating…" : "Create Invoice"}</Button>;
}

export function InvoiceForm({
  action,
  defaults,
  gstEnabled,
  gstRate,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: InvoiceDefaults;
  gstEnabled: boolean;
  gstRate: number;
}) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;
  const [amount, setAmount] = useState<number>(Number(defaults.amount ?? 0));
  const taxRate = gstEnabled ? gstRate : 0;

  const totals = useMemo(() => {
    const subtotal = Math.round(amount * 100) / 100;
    const tax = taxRate ? Math.round((subtotal * taxRate) / 100 * 100) / 100 : 0;
    return { subtotal, tax, total: subtotal + tax };
  }, [amount, taxRate]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <input type="hidden" name="clientId" value={defaults.clientId} />
      <input type="hidden" name="placementId" value={defaults.placementId ?? ""} />
      <input type="hidden" name="taxRate" value={taxRate} />

      <Card>
        <CardHeader><CardTitle>Invoice & Client</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invoiceDate">Invoice Date *</Label>
            <Input id="invoiceDate" name="invoiceDate" type="date" defaultValue={defaults.invoiceDate} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={defaults.dueDate} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientNameSnapshot">Client / Company Name *</Label>
            <Input id="clientNameSnapshot" name="clientNameSnapshot" defaultValue={defaults.clientNameSnapshot} required />
            {e?.clientNameSnapshot ? <p className="text-xs text-red-600">{e.clientNameSnapshot}</p> : null}
          </div>
          <div className="space-y-1.5"><Label htmlFor="contactPerson">Contact Person</Label><Input id="contactPerson" name="contactPerson" defaultValue={defaults.contactPerson} /></div>
          <div className="space-y-1.5"><Label htmlFor="contactEmail">Email</Label><Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaults.contactEmail} /></div>
          <div className="space-y-1.5"><Label htmlFor="contactPhone">Phone</Label><Input id="contactPhone" name="contactPhone" defaultValue={defaults.contactPhone} /></div>
          <div className="md:col-span-2 space-y-1.5"><Label htmlFor="clientAddressSnapshot">Client Address</Label><Textarea id="clientAddressSnapshot" name="clientAddressSnapshot" defaultValue={defaults.clientAddressSnapshot} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Line Item</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Input id="description" name="description" defaultValue={defaults.description} required />
            {e?.description ? <p className="text-xs text-red-600">{e.description}</p> : null}
          </div>
          <div className="space-y-1.5"><Label htmlFor="candidateName">Candidate Name</Label><Input id="candidateName" name="candidateName" defaultValue={defaults.candidateName} /></div>
          <div className="space-y-1.5"><Label htmlFor="jobTitle">Position / Job Title</Label><Input id="jobTitle" name="jobTitle" defaultValue={defaults.jobTitle} /></div>
          <div className="space-y-1.5"><Label htmlFor="joiningDate">Joining Date</Label><Input id="joiningDate" name="joiningDate" type="date" defaultValue={defaults.joiningDate} /></div>
          <div className="space-y-1.5"><Label htmlFor="ctc">CTC (₹)</Label><Input id="ctc" name="ctc" type="number" defaultValue={defaults.ctc} /></div>
          <input type="hidden" name="feeType" value="CUSTOM" />
          <div className="space-y-1.5"><Label htmlFor="feePercent">Fee % (for reference)</Label><Input id="feePercent" name="feePercent" type="number" step="0.001" defaultValue={defaults.feePercent} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Recruitment Fee / Amount (₹) *</Label>
            <Input id="amount" name="amount" type="number" step="0.01" value={amount || ""} onChange={(ev) => setAmount(Number(ev.target.value))} required />
            {e?.amount ? <p className="text-xs text-red-600">{e.amount}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Terms & Totals</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="paymentTerms">Payment Terms</Label><Input id="paymentTerms" name="paymentTerms" defaultValue={defaults.paymentTerms} /></div>
          <div className="space-y-1.5"><Label htmlFor="replacementTerms">Replacement Guarantee Terms</Label><Input id="replacementTerms" name="replacementTerms" defaultValue={defaults.replacementTerms} /></div>
          <div className="md:col-span-2 space-y-1.5"><Label htmlFor="bankDetailsSnapshot">Bank / Payment Details</Label><Textarea id="bankDetailsSnapshot" name="bankDetailsSnapshot" defaultValue={defaults.bankDetailsSnapshot} /></div>
          <div className="md:col-span-2 space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={defaults.notes} /></div>

          <div className="md:col-span-2 rounded-md bg-secondary p-4">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-medium">{formatINR(totals.subtotal)}</span></div>
            {taxRate > 0 ? (
              <div className="flex justify-between text-sm"><span>GST ({taxRate}%)</span><span className="font-medium">{formatINR(totals.tax)}</span></div>
            ) : (
              <div className="flex justify-between text-xs text-muted-foreground"><span>GST</span><span>Disabled</span></div>
            )}
            <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold text-navy"><span>Total</span><span>{formatINR(totals.total)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Submit /></div>
    </form>
  );
}
