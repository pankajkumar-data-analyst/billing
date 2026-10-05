import { requirePermission, currentUser, isAdmin } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/app/page-header";
import { EmployeeForm } from "../employee-form";
import { createEmployee } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  await requirePermission(PERMISSIONS.EMPLOYEE_MANAGE);
  const user = await currentUser();
  return (
    <div>
      <PageHeader title="New Employee" />
      <EmployeeForm action={createEmployee} isAdmin={!!user && isAdmin(user)} />
    </div>
  );
}
