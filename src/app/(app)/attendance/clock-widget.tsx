"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clockIn, clockOut } from "./actions";
import { formatTime } from "@/lib/utils";
import { formatWorkedDuration } from "@/lib/services/attendance";

/**
 * Mobile-first clock in/out widget (spec §17, §39, §49). Large tap targets,
 * single primary action, live today's summary.
 */
export function ClockWidget({
  clockInAt,
  clockOutAt,
  workedMinutes,
  name,
}: {
  clockInAt: string | null;
  clockOutAt: string | null;
  workedMinutes: number;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasClockedIn = !!clockInAt;
  const hasClockedOut = !!clockOutAt;

  function doClockIn() {
    setError(null);
    startTransition(async () => {
      const r = await clockIn();
      if (r?.error) setError(r.error);
    });
  }
  function doClockOut() {
    setError(null);
    startTransition(async () => {
      const r = await clockOut();
      if (r?.error) setError(r.error);
    });
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <Card className="overflow-hidden">
      <div className="bg-navy px-6 py-5 text-white">
        <p className="text-sm text-white/70">{greeting},</p>
        <p className="text-xl font-semibold">{name}</p>
      </div>
      <CardContent className="pt-5">
        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <div><p className="text-xs text-muted-foreground">Clock In</p><p className="text-lg font-semibold text-navy">{clockInAt ? formatTime(clockInAt) : "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">Clock Out</p><p className="text-lg font-semibold text-navy">{clockOutAt ? formatTime(clockOutAt) : "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">Worked</p><p className="text-lg font-semibold text-navy">{workedMinutes > 0 ? formatWorkedDuration(workedMinutes) : "-"}</p></div>
        </div>

        {error ? <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {!hasClockedIn ? (
          <Button variant="gold" size="lg" className="w-full text-base" disabled={pending} onClick={doClockIn}>
            {pending ? "…" : "Clock In"}
          </Button>
        ) : !hasClockedOut ? (
          <Button variant="default" size="lg" className="w-full text-base" disabled={pending} onClick={doClockOut}>
            {pending ? "…" : "Clock Out"}
          </Button>
        ) : (
          <div className="rounded-md bg-green-50 py-3 text-center text-sm font-medium text-green-700">
            You&apos;re done for today ✓
          </div>
        )}
      </CardContent>
    </Card>
  );
}
