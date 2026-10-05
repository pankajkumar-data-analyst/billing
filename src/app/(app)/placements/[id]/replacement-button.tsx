"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { markReplacementRequired } from "../actions";

/** Confirm-then-flag a placement as needing a replacement (spec §24, §40). */
export function ReplacementButton({ placementId }: { placementId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        Mark Replacement Required
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Confirm?</span>
      <Button
        variant="destructive"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await markReplacementRequired(placementId);
          setPending(false);
          setConfirming(false);
        }}
      >
        {pending ? "Working…" : "Yes, mark it"}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
    </div>
  );
}
