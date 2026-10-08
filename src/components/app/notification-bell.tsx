"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { markRead, markAllRead } from "@/app/(app)/notifications/actions";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-white text-foreground shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-semibold text-navy">Notifications</span>
              {unread > 0 ? (
                <button onClick={() => start(() => markAllRead())} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-navy">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              ) : null}
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications.</p>
              ) : (
                items.map((n) => {
                  const content = (
                    <div className={cn("border-b px-4 py-3 last:border-0", !n.isRead && "bg-gold/5")}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm", !n.isRead ? "font-semibold text-navy" : "text-foreground")}>{n.title}</p>
                        {!n.isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" /> : null}
                      </div>
                      {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                    </div>
                  );
                  return (
                    <div key={n.id} onClick={() => start(() => markRead(n.id))}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => setOpen(false)}>{content}</Link>
                      ) : (
                        content
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
