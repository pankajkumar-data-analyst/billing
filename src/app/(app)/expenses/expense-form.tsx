"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ActionState = { error?: string };

const CATEGORIES = ["Job Portal", "LinkedIn", "Naukri", "Indeed", "Advertising", "Software", "Internet", "Office", "Travel", "Salary", "Recruitment Operations", "Miscellaneous"];

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending} className="w-full">{pending ? "Saving…" : "Add Expense"}</Button>;
}

export function ExpenseForm({ action }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useFormState(action, {});
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <div className="space-y-1.5"><Label htmlFor="expenseDate">Date</Label><Input id="expenseDate" name="expenseDate" type="date" defaultValue={today} required /></div>
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select id="category" name="category" required>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="amount">Amount (₹)</Label><Input id="amount" name="amount" type="number" step="0.01" required /></div>
      <div className="space-y-1.5"><Label htmlFor="vendor">Vendor</Label><Input id="vendor" name="vendor" /></div>
      <div className="space-y-1.5"><Label htmlFor="paymentMethod">Payment Method</Label><Input id="paymentMethod" name="paymentMethod" /></div>
      <div className="space-y-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" /></div>
      <Submit />
    </form>
  );
}
