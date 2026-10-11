import type { SessionUser } from "@/lib/auth/guards";
import type { Prisma } from "@prisma/client";

/**
 * Row-level scoping helpers.
 *
 * The team is small (a few trusted users) and the recruiter row-level
 * restriction was removed — every signed-in user with the relevant permission
 * can see all jobs, candidates, clients and placements. These helpers now
 * return an empty `where` fragment, but are kept as a single choke-point so a
 * stricter scope can be reintroduced later in one place if ever needed.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export function jobScope(_user: SessionUser): Prisma.JobWhereInput {
  return {};
}

export function candidateScope(_user: SessionUser): Prisma.CandidateWhereInput {
  return {};
}

export function clientScope(_user: SessionUser): Prisma.ClientWhereInput {
  return {};
}

export function placementScope(_user: SessionUser): Prisma.PlacementWhereInput {
  return {};
}
