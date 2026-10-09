"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };
interface Candidate { id: string; fullName: string; mobile: string | null; currentCompany: string | null }
interface Option { id: string; label: string }

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Adding…" : "Add to Pipeline"}</Button>;
}

export function AddCandidateForm({
  action,
  candidates,
  recruiters,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  candidates: Candidate[];
  recruiters: Option[];
}) {
  const [state, formAction] = useFormState(action, {});
  const [mode, setMode] = useState<"existing" | "new">(candidates.length > 0 ? "existing" : "new");
  const e = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="button" variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode("existing")}>Existing Candidate</Button>
        <Button type="button" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>New Candidate</Button>
      </div>

      {mode === "existing" ? (
        <Card>
          <CardHeader><CardTitle>Select Existing Candidate</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Reuse an existing record to avoid duplicates. The same candidate can be linked to multiple jobs.
            </p>
            <Select name="existingCandidateId" defaultValue="">
              <option value="">Select candidate…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}{c.currentCompany ? ` - ${c.currentCompany}` : ""}{c.mobile ? ` (${c.mobile})` : ""}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>New Candidate</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="existingCandidateId" value="" />
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" name="fullName" required />
              {e?.fullName ? <p className="text-xs text-red-600">{e.fullName}</p> : null}
            </div>
            <div className="space-y-1.5"><Label htmlFor="mobile">Mobile</Label><Input id="mobile" name="mobile" /></div>
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
            <div className="space-y-1.5"><Label htmlFor="location">Location</Label><Input id="location" name="location" /></div>
            <div className="space-y-1.5"><Label htmlFor="currentCompany">Current Company</Label><Input id="currentCompany" name="currentCompany" /></div>
            <div className="space-y-1.5"><Label htmlFor="currentDesignation">Current Designation</Label><Input id="currentDesignation" name="currentDesignation" /></div>
            <div className="space-y-1.5"><Label htmlFor="totalExperience">Total Experience (yrs)</Label><Input id="totalExperience" name="totalExperience" type="number" step="0.1" /></div>
            <div className="space-y-1.5"><Label htmlFor="currentCtc">Current CTC (₹)</Label><Input id="currentCtc" name="currentCtc" type="number" /></div>
            <div className="space-y-1.5"><Label htmlFor="expectedCtc">Expected CTC (₹)</Label><Input id="expectedCtc" name="expectedCtc" type="number" /></div>
            <div className="space-y-1.5"><Label htmlFor="noticePeriod">Notice Period</Label><Input id="noticePeriod" name="noticePeriod" /></div>
            <div className="space-y-1.5">
              <Label htmlFor="recruiterId">Recruiter</Label>
              <Select id="recruiterId" name="recruiterId" defaultValue="">
                <option value="">Unassigned</option>
                {recruiters.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="source">Source</Label><Input id="source" name="source" placeholder="Naukri, LinkedIn, Referral…" /></div>
            <div className="md:col-span-2 space-y-1.5"><Label htmlFor="skills">Skills</Label><Input id="skills" name="skills" /></div>
            <div className="md:col-span-2 space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end"><Submit /></div>
    </form>
  );
}
