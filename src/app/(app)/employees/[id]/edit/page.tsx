import { notFound } from "next/navigation";
import { requirePermission, currentUser, isAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { EmployeeForm } from "../../employee-form";
import { EmployeeLoginForm } from "../../employee-login-form";
import { updateEmployee, setEmployeeLogin } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.EMPLOYEE_MANAGE);
  const user = await currentUser();
  const admin = !!user && isAdmin(user);

  const emp = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: { include: { role: true } } },
  });
  if (!emp) notFound();

  const defaults = {
    name: emp.name,
    employeeCode: emp.employeeCode,
    phone: emp.phone,
    designation: emp.designation,
    department: emp.department,
    joiningDate: emp.joiningDate ? emp.joiningDate.toISOString().slice(0, 10) : "",
    employmentType: emp.employmentType,
    status: emp.status,
    address: emp.address,
    emergencyContact: emp.emergencyContact,
    // Salary/bank only prefilled for admins (and the form only renders them for admins).
    monthlySalary: admin ? emp.monthlySalary?.toString() : undefined,
    pan: admin ? emp.pan : undefined,
    bankName: admin ? emp.bankName : undefined,
    bankAccount: admin ? emp.bankAccount : undefined,
    bankIfsc: admin ? emp.bankIfsc : undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${emp.name}`} />
      <EmployeeForm action={updateEmployee.bind(null, emp.id)} isAdmin={admin} defaults={defaults} mode="edit" />
      {admin ? (
        <EmployeeLoginForm
          action={setEmployeeLogin.bind(null, emp.id)}
          existing={emp.user ? { email: emp.user.email, roleName: emp.user.role.name } : null}
        />
      ) : null}
    </div>
  );
}
