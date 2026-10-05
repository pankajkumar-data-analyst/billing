"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

export interface ApplicationOption {
  id: string;
  label: string; // "Candidate — Job (Client)"
  defaultFeeType: string;
  defaultPercent?: string | null;
  defaultFixed?: string | null;
  guaranteeDays: number;
  expectedCtc?: string | null;
}

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Creating…" : "Create Placement"}</Button>;
}

/**
 * Live fee preview mirrors lib/services/recruitment-fee. The authoritative
 * calculation happens again on the server at submit — this is UX only.
 */
function previewFee(feeType: string, annualCtc: number, percent: number, fixed: number): number {
  if (!annualCtc && feeType === "PERCENT") return 0;
  switch (feeType) {
    case "PERCENT": return Math.round((annualCtc * percent) / 100 * 100) / 100;
    case "FIXED": return Math.round(fixed * 100) / 100;
    case "CUSTOM": return Math.round(fixed * 100) / 100;
    default: return 0;
  }
}

export function PlacementForm({
  action,
  applications,
  preselectedId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  applications: ApplicationOption[];
  preselectedId?: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;

  const initial = applications.find((a) => a.id === preselectedId) ?? applications[0];
  const [appId, setAppId] = useState(initial?.id ?? "");
  const selected = applications.find((a) => a.id === appId);

  const [feeType, setFeeType] = useState(selected?.defaultFeeType ?? "PERCENT");
  const [annualCtc, setAnnualCtc] = useState<number>(Number(selected?.expectedCtc ?? 0));
  const [percent, setPercent] = useState<number>(Number(selected?.defaultPercent ?? 0));
  const [fixed, setFixed] = useState<number>(Number(selected?.defaultFixed ?? 0));
  const [customFee, setCustomFee] = useState<number>(0);

  const fee = useMemo(() => {
    if (feeType === "CUSTOM") return previewFee("CUSTOM", annualCtc, 0, customFee);
    return previewFee(feeType, annualCtc, percent, fixed);
  }, [feeType, annualCtc, percent, fixed, customFee]);

  function onSelectApp(id: string) {
    setAppId(id);
    const a = applications.find((x) => x.id === id);
    if (a) {
      setFeeType(a.defaultFeeType);
      setPercent(Number(a.defaultPercent ?? 0));
      setFixed(Number(a.defaultFixed ?? 0));
      setAnnualCtc(Number(a.expectedCtc ?? 0));
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <Card>
        <CardHeader><CardTitle>Placement</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="applicationId">Candidate / Job *</Label>
            <Select id="applicationId" name="applicationId" value={appId} onChange={(ev) => onSelectApp(ev.target.value)} required>
              <option value="">Select…</option>
              {applications.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </Select>
            {e?.applicationId ? <p className="text-xs text-red-600">{e.applicationId}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="joiningDate">Joining Date *</Label>
            <Input id="joiningDate" name="joiningDate" type="date" required />
            {e?.joiningDate ? <p className="text-xs text-red-600">{e.joiningDate}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guaranteeDays">Replacement Guarantee (days)</Label>
            <Input id="guaranteeDays" name="guaranteeDays" type="number" defaultValue={selected?.guaranteeDays ?? 90} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offeredCtc">Offered CTC (₹) *</Label>
            <Input id="offeredCtc" name="offeredCtc" type="number" value={annualCtc || ""} onChange={(ev) => setAnnualCtc(Number(ev.target.value))} required />
            {e?.offeredCtc ? <p className="text-xs text-red-600">{e.offeredCtc}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="annualCtc">Annual CTC (₹) *</Label>
            <Input id="annualCtc" name="annualCtc" type="number" value={annualCtc || ""} onChange={(ev) => setAnnualCtc(Number(ev.target.value))} required />
            {e?.annualCtc ? <p className="text-xs text-red-600">{e.annualCtc}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recruitment Fee</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="feeType">Fee Type</Label>
            <Select id="feeType" name="feeType" value={feeType} onChange={(ev) => setFeeType(ev.target.value)}>
              <option value="PERCENT">Percentage of annual CTC</option>
              <option value="FIXED">Fixed fee</option>
              <option value="CUSTOM">Custom amount</option>
            </Select>
          </div>
          <div />
          {feeType === "PERCENT" ? (
            <div className="space-y-1.5">
              <Label htmlFor="feePercent">Percentage (%)</Label>
              <Input id="feePercent" name="feePercent" type="number" step="0.001" value={percent || ""} onChange={(ev) => setPercent(Number(ev.target.value))} />
            </div>
          ) : null}
          {feeType === "FIXED" ? (
            <div className="space-y-1.5">
              <Label htmlFor="fixedFee">Fixed Fee (₹)</Label>
              <Input id="fixedFee" name="fixedFee" type="number" value={fixed || ""} onChange={(ev) => setFixed(Number(ev.target.value))} />
            </div>
          ) : null}
          {feeType === "CUSTOM" ? (
            <div className="space-y-1.5">
              <Label htmlFor="customFee">Custom Fee (₹)</Label>
              <Input id="customFee" name="customFee" type="number" value={customFee || ""} onChange={(ev) => setCustomFee(Number(ev.target.value))} />
            </div>
          ) : null}

          <div className="md:col-span-2 rounded-md bg-gold/10 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Calculated Recruitment Fee</p>
            <p className="mt-1 text-2xl font-bold text-navy">{formatINR(fee)}</p>
            {feeType === "PERCENT" && annualCtc > 0 ? (
              <p className="text-xs text-muted-foreground">{percent}% of {formatINR(annualCtc)}</p>
            ) : null}
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Submit /></div>
    </form>
  );
}
