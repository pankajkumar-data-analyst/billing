"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitRegularization, decideRegularization } from "./regularize-actions";

type ActionState = { error?: string; ok?: boolean };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending} className="w-full">{pending ? "Submitting…" : "Submit Request"}</Button>;
}

/** Employee form to request an attendance correction. */
export function RegularizeForm() {
  const [state, formAction] = useFormState(submitRegularization, {} as ActionState);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Request submitted for approval.</p> : null}
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={today} max={today} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="requestedIn">Clock In</Label><Input id="requestedIn" name="requestedIn" type="time" /></div>
        <div className="space-y-1.5"><Label htmlFor="requestedOut">Clock Out</Label><Input id="requestedOut" name="requestedOut" type="time" /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="reason">Reason</Label><Textarea id="reason" name="reason" placeholder="e.g. Forgot to clock out" required /></div>
      <Submit />
    </form>
  );
}

/** Admin approve/reject controls for a pending correction. */
export function DecideRegularization({ id }: { id: string }) {
  const [open, setOpen] = useState<"APPROVED" | "REJECTED" | null>(null);
  if (!open) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="default" onClick={() => setOpen("APPROVED")}>Approve</Button>
        <Button size="sm" variant="destructive" onClick={() => setOpen("REJECTED")}>Reject</Button>
      </div>
    );
  }
  return (
    <form action={decideRegularization.bind(null, id, open)} className="flex items-center gap-2">
      <Input name="note" placeholder="Note (optional)" className="h-9" />
      <Button size="sm" variant={open === "APPROVED" ? "default" : "destructive"} type="submit">Confirm {open === "APPROVED" ? "Approve" : "Reject"}</Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(null)}>Back</Button>
    </form>
  );
}
