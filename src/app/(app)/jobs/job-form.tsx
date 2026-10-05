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

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  clients: Option[];
  recruiters: Option[];
  defaults?: Record<string, unknown>;
  submitLabel?: string;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : label}</Button>;
}

export function JobForm({ action, clients, recruiters, defaults = {}, submitLabel = "Save Job" }: Props) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;
  const v = (k: string) => (defaults[k] as string | number | undefined) ?? "";

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <Card>
        <CardHeader><CardTitle>Requirement</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client *</Label>
            <Select id="clientId" name="clientId" defaultValue={v("clientId") as string} required>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
            {e?.clientId ? <p className="text-xs text-red-600">{e.clientId}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Job Title *</Label>
            <Input id="title" name="title" defaultValue={v("title")} required />
            {e?.title ? <p className="text-xs text-red-600">{e.title}</p> : null}
          </div>
          <div className="space-y-1.5"><Label htmlFor="location">Location</Label><Input id="location" name="location" defaultValue={v("location")} /></div>
          <div className="space-y-1.5"><Label htmlFor="department">Department</Label><Input id="department" name="department" defaultValue={v("department")} /></div>
          <div className="space-y-1.5"><Label htmlFor="openings">Openings</Label><Input id="openings" name="openings" type="number" min={1} defaultValue={(v("openings") as number) || 1} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="employmentType">Employment Type</Label>
            <Select id="employmentType" name="employmentType" defaultValue={(v("employmentType") as string) || "FULL_TIME"}>
              <option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option><option value="INTERN">Intern</option>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="salaryMin">Salary Min (₹/yr)</Label><Input id="salaryMin" name="salaryMin" type="number" defaultValue={v("salaryMin")} /></div>
          <div className="space-y-1.5"><Label htmlFor="salaryMax">Salary Max (₹/yr)</Label><Input id="salaryMax" name="salaryMax" type="number" defaultValue={v("salaryMax")} /></div>
          <div className="space-y-1.5"><Label htmlFor="expMin">Experience Min (yrs)</Label><Input id="expMin" name="expMin" type="number" defaultValue={v("expMin")} /></div>
          <div className="space-y-1.5"><Label htmlFor="expMax">Experience Max (yrs)</Label><Input id="expMax" name="expMax" type="number" defaultValue={v("expMax")} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="recruiterId">Recruiter Assigned</Label>
            <Select id="recruiterId" name="recruiterId" defaultValue={v("recruiterId") as string}>
              <option value="">Unassigned</option>
              {recruiters.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" name="priority" defaultValue={(v("priority") as string) || "MEDIUM"}>
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option><option value="URGENT">Urgent</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={(v("status") as string) || "NEW"}>
              {["NEW", "ACTIVE", "ON_HOLD", "SUBMITTED", "INTERVIEWING", "FILLED", "CLOSED", "CANCELLED"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5"><Label htmlFor="requiredSkills">Required Skills</Label><Input id="requiredSkills" name="requiredSkills" defaultValue={v("requiredSkills")} placeholder="Comma separated" /></div>
          <div className="md:col-span-2 space-y-1.5"><Label htmlFor="jd">Job Description</Label><Textarea id="jd" name="jd" rows={5} defaultValue={v("jd")} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Submit label={submitLabel} /></div>
    </form>
  );
}
