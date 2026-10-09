import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";
import { titleCase } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { role: true, employee: true } });

  return (
    <div>
      <PageHeader title="My Profile" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Name" v={dbUser?.employee?.name ?? user.name} />
            <Row k="Email" v={dbUser?.email ?? "-"} />
            <Row k="Role" v={titleCase(dbUser?.role.name ?? user.role)} />
            {dbUser?.employee ? <Row k="Employee ID" v={dbUser.employee.employeeCode} /> : null}
            {dbUser?.lastLoginAt ? <Row k="Last Login" v={dbUser.lastLoginAt.toLocaleString("en-IN")} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
          <CardContent><ChangePasswordForm /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 border-b py-1.5 last:border-0"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>;
}
