import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { toCsv, csvResponse } from "@/lib/csv";

export const runtime = "nodejs";

/** GET /api/export/placements — Admin-only CSV of all placements. */
export async function GET() {
  const user = await currentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPORT_EXPORT_FINANCIAL)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const placements = await prisma.placement.findMany({
    include: { candidate: true, client: true, job: true },
    orderBy: { joiningDate: "desc" },
  });
  const csv = toCsv(
    ["Candidate", "Client", "Job", "Joining Date", "Annual CTC", "Fee Type", "Fee", "Status", "Guarantee End"],
    placements.map((p) => [
      p.candidate.fullName,
      p.client.name,
      p.job.title,
      p.joiningDate.toISOString().slice(0, 10),
      p.annualCtc.toString(),
      p.feeType,
      p.calculatedFee.toString(),
      p.status,
      p.guaranteeEnd ? p.guaranteeEnd.toISOString().slice(0, 10) : "",
    ]),
  );
  return csvResponse(`placements-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
