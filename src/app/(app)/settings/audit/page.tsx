import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requirePermission(PERMISSIONS.AUDIT_VIEW);
  const logs = await prisma.auditLog.findMany({
    include: { user: { include: { employee: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Sensitive actions across the system (Admin only)." />
      <Card>
        <Table>
          <THead><TR><TH>When</TH><TH>User</TH><TH>Action</TH><TH>Entity</TH><TH>IP</TH></TR></THead>
          <TBody>
            {logs.length === 0 ? (
              <TR><TD colSpan={5} className="py-10 text-center text-muted-foreground">No audit entries yet.</TD></TR>
            ) : (
              logs.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap">{formatDateTime(l.createdAt)}</TD>
                  <TD>{l.user?.employee?.name ?? l.user?.email ?? "-"}</TD>
                  <TD>{titleCase(l.action)}</TD>
                  <TD>{l.entity ? `${l.entity}${l.entityId ? ` (${l.entityId.slice(0, 8)}…)` : ""}` : "-"}</TD>
                  <TD>{l.ip ?? "-"}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
