"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : label}</Button>;
}

/**
 * Admin-only login management for an existing employee, shown on the edit page.
 * - No login yet: create one (email + role + password).
 * - Login exists: reset the password (and optionally email/role). Password is
 *   only changed when a value is entered, so you can tweak the role alone.
 */
export function EmployeeLoginForm({
  action,
  existing,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  existing: { email: string; roleName: string } | null;
}) {
  const [state, formAction] = useFormState(action, {});
  const e = state.fieldErrors;
  const hasLogin = !!existing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasLogin ? "Login Account (reset password / change role)" : "Login Account (create)"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

          {hasLogin ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This employee can already log in with <strong>{existing!.email}</strong>. Enter a new
              password below to reset it. Leave the password blank to only change the role.
            </p>
          ) : (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
              This employee has no login yet. Fill the fields below to create one.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email {hasLogin ? "" : "*"}</Label>
              <Input id="login-email" name="email" type="email" defaultValue={existing?.email ?? ""} />
              {e?.email ? <p className="text-xs text-red-600">{e.email}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-role">Role</Label>
              <Select id="login-role" name="roleName" defaultValue={existing?.roleName ?? "RECRUITER"}>
                <option value="RECRUITER">Recruiter / Employee</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="login-password">{hasLogin ? "New Password" : "Password *"}</Label>
              <Input
                id="login-password"
                name="password"
                type="text"
                placeholder="Min 10 chars: upper, lower, digit & symbol"
                autoComplete="new-password"
              />
              {e?.password ? <p className="text-xs text-red-600">{e.password}</p> : null}
              <p className="text-xs text-muted-foreground">
                Share it securely with the employee and ask them to change it after first login (Profile → Change Password).
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Submit label={hasLogin ? "Reset Login" : "Create Login"} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
