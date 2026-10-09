"use server";

import { signOut } from "@/lib/auth/auth";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { currentUser } from "@/lib/auth/guards";

/**
 * Logout server action. Must be an explicit action (not a GET link) so that
 * Next.js link prefetching can never trigger it — a prefetched GET /logout was
 * logging users out on every navigation.
 */
export async function logoutAction() {
  const user = await currentUser();
  if (user) await writeAudit({ userId: user.id, action: AUDIT.LOGOUT });
  await signOut({ redirectTo: "/login" });
}
