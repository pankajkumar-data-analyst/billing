"use client";

import { useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { generatePayroll, approvePayslip, markPayslipPaid } from "./actions";

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
  if (status === "DRAFT") return <Button size="sm" variant="default" disabled={pending} onClick={() => start(() => approvePayslip(id))}>Approve</Button>;
  if (status === "APPROVED") return <Button size="sm" variant="gold" disabled={pending} onClick={() => start(() => markPayslipPaid(id))}>Mark Paid</Button>;
  return null;
}
