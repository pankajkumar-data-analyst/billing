import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { currentUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { getSettings } from "@/lib/services/settings";
import { PayslipPdf } from "@/lib/pdf/payslip-pdf";

// PDF generation needs the Node.js runtime (filesystem fonts + heavy deps).
export const runtime = "nodejs";

/**
 * GET /payroll/:id/pdf — stream a payslip PDF.
 * Authorization (server-side):
 *   - PAYROLL_PROCESS (admin) → any payslip
 *   - PAYSLIP_SELF_VIEW       → only the signed-in employee's own payslip,
 *                               and only when APPROVED/PAID (not DRAFT)
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return new NextResponse("Forbidden", { status: 403 });

  const [payslip, settings] = await Promise.all([
    prisma.payslip.findUnique({ where: { id: params.id }, include: { employee: true } }),
    getSettings(),
  ]);
  if (!payslip) return new NextResponse("Not found", { status: 404 });

  const isAdmin = hasPermission(user, PERMISSIONS.PAYROLL_PROCESS);
  const isOwnApproved =
    hasPermission(user, PERMISSIONS.PAYSLIP_SELF_VIEW) &&
    payslip.employee.userId === user.id &&
    (payslip.status === "APPROVED" || payslip.status === "PAID");

  if (!isAdmin && !isOwnApproved) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const buffer = await renderToBuffer(
    PayslipPdf({
      company: {
        name: settings.companyName, address: settings.address,
        phone: settings.phone, email: settings.email, website: settings.website,
      },
      payslip: {
        status: payslip.status,
        periodYear: payslip.periodYear,
        periodMonth: payslip.periodMonth,
        employeeName: payslip.employee.name,
        employeeCode: payslip.employee.employeeCode,
        designation: payslip.employee.designation,
        workingDays: payslip.workingDays,
        presentDays: payslip.presentDays.toString(),
        paidLeave: payslip.paidLeave.toString(),
        unpaidLeave: payslip.unpaidLeave.toString(),
        lopDays: payslip.lopDays.toString(),
        grossSalary: payslip.grossSalary.toString(),
        lopAmount: payslip.lopAmount.toString(),
        bonus: payslip.bonus.toString(),
        deductions: payslip.deductions.toString(),
        netSalary: payslip.netSalary.toString(),
        note: payslip.note,
      },
      footer: settings.invoiceFooter ?? "Thank you.",
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payslip-${payslip.employee.employeeCode}-${payslip.periodYear}-${payslip.periodMonth}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
