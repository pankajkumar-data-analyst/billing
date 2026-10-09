"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { generatePayroll, approvePayslip, markPayslipPaid, setBonusDeductions, reopenPayslip } from "./actions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function GenerateButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Generating…" : "Generate Payroll"}</Button>;
}

export function GeneratePayroll({ year, month }: { year: number; month: number }) {
  const years = [year, year - 1];
  const [state, formAction] = useFormState(generatePayroll, {} as { error?: string; ok?: string });

  // Changing the month/year navigates the page so the table below ALWAYS shows
  // the same period you're about to generate for (fixes: generated September
  // but table was still showing October).
  const navigate = (y: number, m: number) => {
    window.location.href = `/payroll?y=${y}&m=${m}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Month</label>
          <Select defaultValue={month} onChange={(e) => navigate(year, Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Year</label>
          <Select defaultValue={year} onChange={(e) => navigate(Number(e.target.value), month)}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
        {/* Generate for the currently-viewed month/year (hidden inputs carry it). */}
        <form action={formAction}>
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <GenerateButton />
        </form>
      </div>
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.ok}</p> : null}
    </div>
  );
}

export function PayslipActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  if (status === "DRAFT") {
    return <Button size="sm" variant="default" disabled={pending} onClick={() => start(() => approvePayslip(id))}>Approve</Button>;
  }
  // APPROVED / PAID: allow progressing + reopening back to DRAFT to edit.
  return (
    <div className="flex items-center gap-2">
      {status === "APPROVED" ? (
        <Button size="sm" variant="gold" disabled={pending} onClick={() => start(() => markPayslipPaid(id))}>Mark Paid</Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        title="Reopen to DRAFT so you can edit (bonus, regenerate)"
        onClick={() => { if (confirm("Reopen this payslip to DRAFT for editing?")) start(() => reopenPayslip(id)); }}
      >
        Reopen
      </Button>
    </div>
  );
}

/**
 * Inline adjust editor for a DRAFT payslip: present days, extra (weekend/
 * holiday/overtime) days, bonus, deductions. This is how an admin corrects an
 * accidental extra login, adds overtime, or gives a holiday bonus.
 */
export function BonusEditor({
  id, bonus, deductions, presentDays, extraDays,
}: {
  id: string; bonus: string; deductions: string; presentDays: string; extraDays: string;
}) {
  const [open, setOpen] = useState(false);
  const action = setBonusDeductions.bind(null, id);
  const [state, formAction] = useFormState(action, {} as { error?: string; ok?: boolean });

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Adjust</Button>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border bg-secondary/40 p-2">
      <div>
        <label className="block text-[10px] text-muted-foreground">Present days</label>
        <Input name="presentDays" type="number" step="0.5" defaultValue={presentDays} className="h-8 w-20" />
      </div>
      <div>
        <label className="block text-[10px] text-muted-foreground">Extra days</label>
        <Input name="extraDays" type="number" step="0.5" defaultValue={extraDays} className="h-8 w-20" />
      </div>
      <div>
        <label className="block text-[10px] text-muted-foreground">Bonus ₹</label>
        <Input name="bonus" type="number" step="0.01" defaultValue={bonus} className="h-8 w-24" />
      </div>
      <div>
        <label className="block text-[10px] text-muted-foreground">Deductions ₹</label>
        <Input name="deductions" type="number" step="0.01" defaultValue={deductions} className="h-8 w-24" />
      </div>
      <Button size="sm" variant="gold" type="submit">Save</Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>×</Button>
      {state.error ? <span className="w-full text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
