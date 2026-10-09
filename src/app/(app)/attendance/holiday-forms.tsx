"use client";

import { useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addHoliday, deleteHoliday } from "./holiday-actions";
import { formatDate } from "@/lib/utils";
import { X } from "lucide-react";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending} className="w-full">{pending ? "Adding…" : "Add Holiday"}</Button>;
}

export function HolidayForm() {
  const [state, formAction] = useFormState(addHoliday, {} as { error?: string; ok?: boolean });
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Holiday added.</p> : null}
      <div className="space-y-1.5"><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" required /></div>
      <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" placeholder="e.g. Diwali" required /></div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="recurring" /> Repeats every year (same date)
      </label>
      <Submit />
    </form>
  );
}

export function HolidayList({ holidays }: { holidays: { id: string; date: string; name: string; recurring: boolean }[] }) {
  const [, start] = useTransition();
  if (holidays.length === 0) return <p className="text-sm text-muted-foreground">No holidays added yet.</p>;
  return (
    <div className="space-y-2">
      {holidays.map((h) => (
        <div key={h.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
          <div>
            <span className="font-medium text-navy">{h.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.date)}{h.recurring ? " · yearly" : ""}</span>
          </div>
          <button onClick={() => start(() => deleteHoliday(h.id))} className="text-muted-foreground hover:text-red-600" aria-label="Delete holiday">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
