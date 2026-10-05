"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: Record<string, unknown>;
  submitLabel?: string;
}

function Field({
  name,
  label,
  errors,
  children,
}: {
  name: string;
  label: string;
  errors?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {errors?.[name] ? <p className="text-xs text-red-600">{errors[name]}</p> : null}
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function ClientForm({ action, defaults = {}, submitLabel = "Save Client" }: Props) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;
  const v = (k: string) => (defaults[k] as string | number | undefined) ?? "";

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Company</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Company Name *" errors={e}>
            <Input id="name" name="name" defaultValue={v("name")} required />
          </Field>
          <Field name="status" label="Status" errors={e}>
            <Select id="status" name="status" defaultValue={(v("status") as string) || "PROSPECT"}>
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
          <Field name="type" label="Company Type" errors={e}>
            <Input id="type" name="type" defaultValue={v("type")} placeholder="e.g. Pvt Ltd" />
          </Field>
          <Field name="industry" label="Industry" errors={e}>
            <Input id="industry" name="industry" defaultValue={v("industry")} />
          </Field>
          <Field name="website" label="Website" errors={e}>
            <Input id="website" name="website" defaultValue={v("website")} />
          </Field>
          <Field name="city" label="City" errors={e}>
            <Input id="city" name="city" defaultValue={v("city")} />
          </Field>
          <Field name="state" label="State" errors={e}>
            <Input id="state" name="state" defaultValue={v("state")} />
          </Field>
          <Field name="gstin" label="GSTIN (optional)" errors={e}>
            <Input id="gstin" name="gstin" defaultValue={v("gstin")} />
          </Field>
          <div className="md:col-span-2">
            <Field name="address" label="Office Address" errors={e}>
              <Textarea id="address" name="address" defaultValue={v("address")} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field name="billingAddress" label="Billing Address" errors={e}>
              <Textarea id="billingAddress" name="billingAddress" defaultValue={v("billingAddress")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Primary Contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field name="contactName" label="Contact Person" errors={e}>
            <Input id="contactName" name="contactName" defaultValue={v("contactName")} />
          </Field>
          <Field name="contactDesignation" label="Designation" errors={e}>
            <Input id="contactDesignation" name="contactDesignation" defaultValue={v("contactDesignation")} />
          </Field>
          <Field name="contactEmail" label="Email" errors={e}>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={v("contactEmail")} />
          </Field>
          <Field name="contactPhone" label="Phone" errors={e}>
            <Input id="contactPhone" name="contactPhone" defaultValue={v("contactPhone")} />
          </Field>
          <Field name="contactWhatsapp" label="WhatsApp" errors={e}>
            <Input id="contactWhatsapp" name="contactWhatsapp" defaultValue={v("contactWhatsapp")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commercial Terms</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field name="feeType" label="Fee Type" errors={e}>
            <Select id="feeType" name="feeType" defaultValue={(v("feeType") as string) || "PERCENT"}>
              <option value="PERCENT">Percentage of annual CTC</option>
              <option value="FIXED">Fixed fee per candidate</option>
              <option value="TIERED">Tiered</option>
              <option value="CUSTOM">Custom (per placement)</option>
            </Select>
          </Field>
          <div />
          <Field name="percent" label="Percentage (%)" errors={e}>
            <Input id="percent" name="percent" type="number" step="0.001" defaultValue={v("percent")} placeholder="e.g. 6" />
          </Field>
          <Field name="fixedAmount" label="Fixed Amount (₹)" errors={e}>
            <Input id="fixedAmount" name="fixedAmount" type="number" step="0.01" defaultValue={v("fixedAmount")} placeholder="e.g. 15000" />
          </Field>
          <Field name="paymentDueDays" label="Payment Due (days)" errors={e}>
            <Input id="paymentDueDays" name="paymentDueDays" type="number" defaultValue={(v("paymentDueDays") as number) || 15} />
          </Field>
          <Field name="replacementDays" label="Replacement Guarantee (days)" errors={e}>
            <Input id="replacementDays" name="replacementDays" type="number" defaultValue={(v("replacementDays") as number) || 90} />
          </Field>
          <Field name="agreementRef" label="Agreement Reference" errors={e}>
            <Input id="agreementRef" name="agreementRef" defaultValue={v("agreementRef")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Submit label={submitLabel} />
      </div>
    </form>
  );
}
