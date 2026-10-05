"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loginAction } from "./actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

function LoginForm() {
  const [state, formAction] = useFormState(loginAction, {});
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@one2infinite.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••••" />
      </div>
      {state?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="text-xl" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <h1 className="mb-1 text-lg font-semibold text-navy">Welcome back</h1>
            <p className="mb-5 text-sm text-muted-foreground">Sign in to the internal business system.</p>
            <Suspense>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          One2Infinite Recruitment Solutions — authorized users only.
        </p>
      </div>
    </main>
  );
}
