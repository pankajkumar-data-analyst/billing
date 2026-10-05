"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { markSent, cancelInvoice } from "../actions";

export function MarkSentButton({ invoiceId }: { invoiceId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await markSent(invoiceId);
        setPending(false);
      }}
    >
      {pending ? "…" : "Mark as Sent"}
    </Button>
  );
}

export function CancelInvoice({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <Button variant="destructive" onClick={() => setOpen(true)}>Cancel Invoice</Button>;
  return (
    <form action={cancelInvoice.bind(null, invoiceId)} className="w-full space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium text-red-800">Cancel this invoice? It will be retained (never deleted) for audit.</p>
      <Textarea name="reason" placeholder="Reason for cancellation" required />
      <div className="flex gap-2">
        <Button type="submit" variant="destructive">Confirm Cancel</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Keep</Button>
      </div>
    </form>
  );
}

export function EmailTemplate({ template }: { template: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <pre className="whitespace-pre-wrap rounded-md bg-secondary p-3 text-xs text-foreground">{template}</pre>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(template);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied!" : "Copy email text"}
      </Button>
    </div>
  );
}
