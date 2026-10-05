import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/app/page-header";
import { ClientForm } from "../client-form";
import { createClient } from "../actions";

export default async function NewClientPage() {
  await requirePermission(PERMISSIONS.CLIENT_MANAGE);
  return (
    <div>
      <PageHeader title="New Client" subtitle="Add a company and its recruitment terms." />
      <ClientForm action={createClient} submitLabel="Create Client" />
    </div>
  );
}
