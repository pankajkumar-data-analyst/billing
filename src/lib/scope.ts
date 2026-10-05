import type { SessionUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { hasPermission } from "@/lib/auth/guards";
import type { Prisma } from "@prisma/client";

/**
 * Row-level scoping helpers (spec §4: recruiters see only assigned work).
 *
 * These produce Prisma `where` fragments so the DATABASE QUERY itself is
 * scoped — a recruiter can never fetch another recruiter's jobs even by
 * guessing an ID, because the query filters by recruiterId server-side.
 */

/** Jobs a user may see: all (if JOB_VIEW) or only assigned (JOB_VIEW_ASSIGNED). */
export function jobScope(user: SessionUser): Prisma.JobWhereInput {
  if (hasPermission(user, PERMISSIONS.JOB_VIEW)) return {};
  // assigned-only
  return { recruiterId: user.employeeId ?? "__none__" };
}

/** Candidates a recruiter may see: ones they own or applied to their jobs. */
export function candidateScope(user: SessionUser): Prisma.CandidateWhereInput {
  if (hasPermission(user, PERMISSIONS.JOB_VIEW)) return {}; // admins/full viewers
  const empId = user.employeeId ?? "__none__";
  return {
    OR: [{ recruiterId: empId }, { applications: { some: { job: { recruiterId: empId } } } }],
  };
}
