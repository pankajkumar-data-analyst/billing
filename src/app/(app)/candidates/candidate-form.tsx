"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };
interface Option { id: string; label: string }

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : label}</Button>;
}

export function CandidateForm({
  action,
  recruiters,
  defaults = {},
  submitLabel = "Save Candidate",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  recruiters: Option[];
  defaults?: Record<string, unknown>;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;
  const v = (k: string) => (defaults[k] as string | number | undefined) ?? "";

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <Card>
        <CardHeader><CardTitle>Candidate Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" name="fullName" defaultValue={v("fullName")} required />
            {e?.fullName ? <p className="text-xs text-red-600">{e.fullName}</p> : null}
          </div>
          <div className="space-y-1.5"><Label htmlFor="mobile">Mobile</Label><Input id="mobile" name="mobile" defaultValue={v("mobile")} /></div>
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={v("email")} /></div>
          <div className="space-y-1.5"><Label htmlFor="location">Location</Label><Input id="location" name="location" defaultValue={v("location")} /></div>
          <div className="space-y-1.5"><Label htmlFor="currentCompany">Current Company</Label><Input id="currentCompany" name="currentCompany" defaultValue={v("currentCompany")} /></div>
          <div className="space-y-1.5"><Label htmlFor="currentDesignation">Current Designation</Label><Input id="currentDesignation" name="currentDesignation" defaultValue={v("currentDesignation")} /></div>
          <div className="space-y-1.5"><Label htmlFor="totalExperience">Total Experience (yrs)</Label><Input id="totalExperience" name="totalExperience" type="number" step="0.1" defaultValue={v("totalExperience")} /></div>
          <div className="space-y-1.5"><Label htmlFor="noticePeriod">Notice Period</Label><Input id="noticePeriod" name="noticePeriod" defaultValue={v("noticePeriod")} /></div>
          <div className="space-y-1.5"><Label htmlFor="currentCtc">Current CTC (₹)</Label><Input id="currentCtc" name="currentCtc" type="number" defaultValue={v("currentCtc")} /></div>
          <div className="space-y-1.5"><Label htmlFor="expectedCtc">Expected CTC (₹)</Label><Input id="expectedCtc" name="expectedCtc" type="number" defaultValue={v("expectedCtc")} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="recruiterId">Recruiter</Label>
            <Select id="recruiterId" name="recruiterId" defaultValue={v("recruiterId") as string}>
              <option value="">Unassigned</option>
              {recruiters.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="source">Source</Label><Input id="source" name="source" defaultValue={v("source")} placeholder="Naukri, LinkedIn, Referral…" /></div>
          <div className="md:col-span-2 space-y-1.5"><Label htmlFor="skills">Skills</Label><Input id="skills" name="skills" defaultValue={v("skills")} /></div>
          <div className="md:col-span-2 space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={v("notes")} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Submit label={submitLabel} /></div>
    </form>
  );
}
