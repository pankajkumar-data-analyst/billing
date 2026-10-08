"use client";

import { useTransition } from "react";
import { Badge, statusTone } from "@/components/ui/badge";
import { toggleTask } from "./actions";
import { formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function TaskItem({
  id,
  title,
  dueDate,
  priority,
  status,
  assignee,
  notes,
}: {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  status: string;
  assignee?: string | null;
  notes?: string | null;
}) {
  const [pending, start] = useTransition();
  const done = status === "DONE";

  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      <input
        type="checkbox"
        checked={done}
        disabled={pending}
        onChange={() => start(() => toggleTask(id))}
        className="mt-1 h-4 w-4 shrink-0"
      />
      <div className="flex-1">
        <p className={cn("text-sm font-medium", done ? "text-muted-foreground line-through" : "text-navy")}>{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {dueDate ? <span>Due {formatDate(dueDate)}</span> : null}
          {assignee ? <span>· {assignee}</span> : null}
          {notes ? <span>· {notes}</span> : null}
        </div>
      </div>
      <Badge tone={statusTone(priority)}>{titleCase(priority)}</Badge>
    </div>
  );
}
