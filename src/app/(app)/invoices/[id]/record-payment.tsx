"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { recordPayment } from "../../payments/actions";
import { PAYMENT_MODES, titleCase } from "@/lib/labels";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : "Record Payment"}</Button>;
}

export function RecordPaymentForm({ invoiceId, outstanding }: { invoiceId: string; outstanding: string }) {
  const [state, formAction] = useFormState(recordPayment, {} as ActionState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input id="amount" name="amount" type="number" step="0.01" max={outstanding} placeholder={outstanding} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paymentDate">Date</Label>
          <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mode">Mode</Label>
          <Select id="mode" name="mode" defaultValue="BANK_TRANSFER">
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" name="reference" placeholder="UTR / txn id" />
        </div>
      </div>
      <Submit />
    </form>
  );
}
