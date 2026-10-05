"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : "Create Employee"}</Button>;
}

/**
 * Employee form. Salary/bank blocks + login provisioning are only rendered for
 * Admins (isAdmin). The server independently re-checks admin before persisting
 * sensitive fields — this prop only controls display.
 */
export function EmployeeForm({
  action,
  isAdmin,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  isAdmin: boolean;
}) {
  const [state, formAction] = useFormState(action, {});
  const [createLogin, setCreateLogin] = useState(false);
  const e = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <Card>
        <CardHeader><CardTitle>Employee</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="name">Name *</Label><Input id="name" name="name" required />{e?.name ? <p className="text-xs text-red-600">{e.name}</p> : null}</div>
          <div className="space-y-1.5"><Label htmlFor="employeeCode">Employee ID *</Label><Input id="employeeCode" name="employeeCode" required />{e?.employeeCode ? <p className="text-xs text-red-600">{e.employeeCode}</p> : null}</div>
          <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" /></div>
          <div className="space-y-1.5"><Label htmlFor="designation">Designation</Label><Input id="designation" name="designation" /></div>
          <div className="space-y-1.5"><Label htmlFor="department">Department</Label><Input id="department" name="department" /></div>
          <div className="space-y-1.5"><Label htmlFor="joiningDate">Joining Date</Label><Input id="joiningDate" name="joiningDate" type="date" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="employmentType">Employment Type</Label>
            <Select id="employmentType" name="employmentType" defaultValue="FULL_TIME">
              <option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option><option value="INTERN">Intern</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Active</option><option value="ON_NOTICE">On Notice</option>
              <option value="INACTIVE">Inactive</option><option value="EXITED">Exited</option>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5"><Label htmlFor="address">Address</Label><Textarea id="address" name="address" /></div>
          <div className="space-y-1.5"><Label htmlFor="emergencyContact">Emergency Contact</Label><Input id="emergencyContact" name="emergencyContact" /></div>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader><CardTitle>Salary & Bank (Admin only — never visible to employees)</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="monthlySalary">Monthly Salary (₹)</Label><Input id="monthlySalary" name="monthlySalary" type="number" step="0.01" /></div>
            <div className="space-y-1.5"><Label htmlFor="pan">PAN</Label><Input id="pan" name="pan" /></div>
            <div className="space-y-1.5"><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" name="bankName" /></div>
            <div className="space-y-1.5"><Label htmlFor="bankAccount">Account Number</Label><Input id="bankAccount" name="bankAccount" /></div>
            <div className="space-y-1.5"><Label htmlFor="bankIfsc">IFSC</Label><Input id="bankIfsc" name="bankIfsc" /></div>
          </CardContent>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <CardHeader><CardTitle>Login Account (optional)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="createLogin" checked={createLogin} onChange={(ev) => setCreateLogin(ev.target.checked)} />
              Create a login so this employee can access the system
            </label>
            {createLogin ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" />{e?.email ? <p className="text-xs text-red-600">{e.email}</p> : null}</div>
                <div className="space-y-1.5">
                  <Label htmlFor="roleName">Role</Label>
                  <Select id="roleName" name="roleName" defaultValue="RECRUITER">
                    <option value="RECRUITER">Recruiter / Employee</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="password">Temporary Password *</Label>
                  <Input id="password" name="password" type="text" placeholder="Min 10 chars, upper/lower/digit/symbol" />
                  {e?.password ? <p className="text-xs text-red-600">{e.password}</p> : null}
                  <p className="text-xs text-muted-foreground">Share securely. Ask them to change it after first login.</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end"><Submit /></div>
    </form>
  );
}
