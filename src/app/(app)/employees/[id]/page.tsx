import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission(PERMISSIONS.EMPLOYEE_VIEW);
  const canSeeSalary = hasPermission(user, PERMISSIONS.SALARY_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.EMPLOYEE_MANAGE);

  const emp = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: { include: { role: true } } },
  });
  if (!emp) notFound();

  const basics: [string, string | null][] = [
    ["Employee ID", emp.employeeCode],
    ["Phone", emp.phone],
    ["Designation", emp.designation],
    ["Department", emp.department],
    ["Joining Date", emp.joiningDate ? formatDate(emp.joiningDate) : null],
    ["Employment Type", titleCase(emp.employmentType)],
    ["Login", emp.user ? `${emp.user.email} (${titleCase(emp.user.role.name)})` : "No login"],
    ["Address", emp.address],
    ["Emergency Contact", emp.emergencyContact],
  ];

  return (
    <div>
      <PageHeader
        title={emp.name}
        subtitle={emp.designation ?? undefined}
        action={canManage ? <Link href={`/employees/${emp.id}/edit`} className={buttonVariants({ variant: "outline" })}>Edit</Link> : null}
      />
      <div className="mb-4"><Badge tone={statusTone(emp.status)}>{titleCase(emp.status)}</Badge></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {basics.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b py-1.5 last:border-0">
                <span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {canSeeSalary ? (
          <Card>
            <CardHeader><CardTitle>Salary & Bank <span className="text-xs font-normal text-muted-foreground">(Admin only)</span></CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row k="Monthly Salary" v={emp.monthlySalary ? formatINR(emp.monthlySalary) : "-"} />
              <Row k="PAN" v={emp.pan ?? "-"} />
              <Row k="Bank" v={emp.bankName ?? "-"} />
              <Row k="Account" v={emp.bankAccount ?? "-"} />
              <Row k="IFSC" v={emp.bankIfsc ?? "-"} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 border-b py-1.5 last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>;
}
