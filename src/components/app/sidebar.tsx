"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { visibleNav } from "./nav-config";
import { Menu, X, LogOut } from "lucide-react";

/**
 * Responsive SaaS sidebar. On desktop it is a fixed left rail; on mobile it is
 * a slide-over drawer toggled by a hamburger in the top bar.
 */
export function Sidebar({
  permissions,
  user,
}: {
  permissions: string[];
  user: { name: string; role: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = visibleNav(permissions);

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-gold/20 text-navy" : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <div className="mb-2 px-2">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-white/50">
          {user.role === "SUPER_ADMIN" ? "Super Admin" : "Recruiter"}
        </p>
      </div>
      <Link
        href="/logout"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </Link>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-navy px-4 py-3 md:hidden">
        <Logo variant="image" className="h-9" />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-white">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-navy">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <Logo variant="image" className="h-9" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col bg-navy md:sticky md:top-0 md:flex">
        <div className="flex items-center justify-center border-b border-white/10 px-5 py-5">
          <Logo variant="image" className="h-24" />
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
