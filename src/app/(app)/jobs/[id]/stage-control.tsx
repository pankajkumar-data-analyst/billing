"use client";

import Link from "next/link";
import { PIPELINE_STAGES, titleCase } from "@/lib/labels";
import { changeStage } from "./stage-actions";
import { buttonVariants } from "@/components/ui/button";

/**
 * Inline stage selector for a candidate application. Submits to a server action
 * (authorization enforced there). When the candidate is SELECTED/JOINED and no
 * placement exists yet, a "Create Placement" shortcut appears (spec §9, §48).
 */
export function StageControl({
  applicationId,
  current,
  hasPlacement,
  placementId,
}: {
  applicationId: string;
  current: string;
  hasPlacement: boolean;
  placementId?: string;
}) {
  const showCreatePlacement = (current === "SELECTED" || current === "JOINED") && !hasPlacement;

  return (
    <div className="flex items-center gap-2">
      <form action={changeStage}>
        <input type="hidden" name="applicationId" value={applicationId} />
        <select
          name="stage"
          defaultValue={current}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{titleCase(s)}</option>
          ))}
        </select>
      </form>
      {showCreatePlacement ? (
        <Link
          href={`/placements/new?applicationId=${applicationId}`}
          className={buttonVariants({ variant: "gold", size: "sm" })}
        >
          Create Placement
        </Link>
      ) : null}
      {hasPlacement && placementId ? (
        <Link href={`/placements/${placementId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          View Placement
        </Link>
      ) : null}
    </div>
  );
}
