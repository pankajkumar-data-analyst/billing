import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import type { PermissionKey } from "@/lib/rbac";
import { ROLES } from "@/lib/rbac";

/**
 * Server-side authorization (spec §29: "Every sensitive operation must be
 * authorized on the backend/server. Never rely only on frontend route hiding.")
 *
 * These helpers run inside Server Components, Route Handlers and Server Actions.
 * They throw/redirect — they never silently pass.
 */

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  employeeId: string | null;
}

/** Get the current user or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

/** Require an authenticated user; redirect to /login if absent. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export function hasPermission(user: SessionUser, permission: PermissionKey): boolean {
  return user.permissions.includes(permission);
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === ROLES.SUPER_ADMIN;
}

/**
 * Require a permission. For use in Server Components (page guards): redirects to
 * /403 if the signed-in user lacks it.
 */
export async function requirePermission(permission: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) redirect("/403");
  return user;
}

/**
 * Assert a permission inside a Server Action / Route Handler. Throws
 * AuthorizationError (caught by the action and surfaced as an error) rather
 * than redirecting, so the client gets a clean failure.
 */
export async function assertPermission(permission: PermissionKey): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new AuthorizationError("Not authenticated");
  if (!hasPermission(user, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
  return user;
}

/** Assert the user is the Super Admin (owner). */
export async function assertAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new AuthorizationError("Not authenticated");
  if (!isAdmin(user)) throw new AuthorizationError("Admin only");
  return user;
}
