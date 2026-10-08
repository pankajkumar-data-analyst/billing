"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask } from "./actions";

interface Option { id: string; label: string }

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending} className="w-full">{pending ? "Adding…" : "Add Task"}</Button>;
}

export function TaskForm({ assignees }: { assignees: Option[] }) {
  const [state, formAction] = useFormState(createTask, {} as { error?: string });
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <div className="space-y-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" placeholder="e.g. Follow up with ABC Pvt Ltd" required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="dueDate">Due Date</Label><Input id="dueDate" name="dueDate" type="date" /></div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option><option value="URGENT">Urgent</option>
          </Select>
        </div>
      </div>
      {assignees.length > 0 ? (
        <div className="space-y-1.5">
          <Label htmlFor="assigneeId">Assign To</Label>
          <Select id="assigneeId" name="assigneeId" defaultValue="">
            <option value="">Me</option>
            {assignees.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </Select>
        </div>
      ) : null}
      <div className="space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div>
      <Submit />
    </form>
  );
}
