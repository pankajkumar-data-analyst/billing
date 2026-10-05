import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/money";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const user = await requirePermission(PERMISSIONS.EMPLOYEE_VIEW);
  const canManage = hasPermission(user, PERMISSIONS.EMPLOYEE_MANAGE);
  const canSeeSalary = hasPermission(user, PERMISSIONS.SALARY_VIEW);

  const employees = await prisma.employee.findMany({
    include: { user: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        action={canManage ? <Link href="/employees/new" className={buttonVariants({ variant: "gold" })}><Plus className="h-4 w-4" /> New Employee</Link> : null}
      />
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH><TH>Code</TH><TH>Designation</TH><TH>Role</TH>
              {canSeeSalary ? <TH>Monthly Salary</TH> : null}
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {employees.map((emp) => (
              <TR key={emp.id}>
                <TD><Link href={`/employees/${emp.id}`} className="font-medium text-navy hover:underline">{emp.name}</Link></TD>
                <TD>{emp.employeeCode}</TD>
                <TD>{emp.designation ?? "—"}</TD>
                <TD>{emp.user ? titleCase(emp.user.role.name) : "No login"}</TD>
                {canSeeSalary ? <TD>{emp.monthlySalary ? formatINR(emp.monthlySalary) : "—"}</TD> : null}
                <TD><Badge tone={statusTone(emp.status)}>{titleCase(emp.status)}</Badge></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
