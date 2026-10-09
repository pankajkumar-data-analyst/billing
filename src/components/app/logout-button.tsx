"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/logout/actions";

/** Sign-out as a form POST (never a prefetchable GET link). */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </form>
  );
}
