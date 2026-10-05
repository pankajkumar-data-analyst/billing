"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "./actions";

type ActionState = { error?: string; ok?: boolean };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : "Update Password"}</Button>;
}

export function ChangePasswordForm() {
  const [state, formAction] = useFormState(changePassword, {} as ActionState);
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Password updated.</p> : null}
      <div className="space-y-1.5"><Label htmlFor="current">Current Password</Label><Input id="current" name="current" type="password" required /></div>
      <div className="space-y-1.5"><Label htmlFor="next">New Password</Label><Input id="next" name="next" type="password" required /><p className="text-xs text-muted-foreground">Min 10 chars with upper, lower, digit and symbol.</p></div>
      <div className="space-y-1.5"><Label htmlFor="confirm">Confirm New Password</Label><Input id="confirm" name="confirm" type="password" required /></div>
      <Submit />
    </form>
  );
}
