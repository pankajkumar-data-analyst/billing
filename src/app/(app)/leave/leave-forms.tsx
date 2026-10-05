"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyLeave, cancelLeave, decideLeave } from "./actions";
import { LEAVE_TYPES, titleCase } from "@/lib/labels";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending} className="w-full">{pending ? "Submitting…" : "Apply for Leave"}</Button>;
}

export function ApplyLeaveForm() {
  const [state, formAction] = useFormState(applyLeave, {} as { error?: string });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <Select id="type" name="type" required>{LEAVE_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="fromDate">From</Label><Input id="fromDate" name="fromDate" type="date" defaultValue={today} required /></div>
        <div className="space-y-1.5"><Label htmlFor="toDate">To</Label><Input id="toDate" name="toDate" type="date" defaultValue={today} required /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="reason">Reason</Label><Textarea id="reason" name="reason" /></div>
      <Submit />
    </form>
  );
}

export function CancelLeaveButton({ leaveId }: { leaveId: string }) {
  const [pending, start] = useTransition();
  return <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => cancelLeave(leaveId))}>Cancel</Button>;
}

export function DecideLeave({ leaveId }: { leaveId: string }) {
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
    <form action={decideLeave.bind(null, leaveId, open)} className="flex items-center gap-2">
      <Input name="note" placeholder="Note (optional)" className="h-9" />
      <Button size="sm" variant={open === "APPROVED" ? "default" : "destructive"} type="submit">Confirm {titleCase(open)}</Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(null)}>Back</Button>
    </form>
  );
}
