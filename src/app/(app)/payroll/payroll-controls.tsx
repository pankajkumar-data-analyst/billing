"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { generatePayroll, approvePayslip, markPayslipPaid } from "./actions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function GeneratePayroll({ year, month }: { year: number; month: number }) {
  const years = [year, year - 1];
  return (
    <form action={generatePayroll} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Month</label>
        <Select name="month" defaultValue={month}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Year</label>
        <Select name="year" defaultValue={year}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</Select>
      </div>
      <Button type="submit" variant="gold">Generate Payroll</Button>
    </form>
  );
}

export function PayslipActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  if (status === "DRAFT") return <Button size="sm" variant="default" disabled={pending} onClick={() => start(() => approvePayslip(id))}>Approve</Button>;
  if (status === "APPROVED") return <Button size="sm" variant="gold" disabled={pending} onClick={() => start(() => markPayslipPaid(id))}>Mark Paid</Button>;
  return null;
}
