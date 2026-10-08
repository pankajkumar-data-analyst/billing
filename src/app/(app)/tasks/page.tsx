import { requireUser, hasPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskForm } from "./task-form";
import { TaskItem } from "./task-item";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireUser();
  // Admins see all tasks; employees see only their own (server-side scope).
  const isAdmin = hasPermission(user, PERMISSIONS.USER_MANAGE);
  const scope: Prisma.TaskWhereInput = isAdmin ? {} : { assigneeId: user.employeeId ?? "__none__" };

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [openTasks, doneTasks, assignees] = await Promise.all([
    prisma.task.findMany({ where: { AND: [scope, { status: { in: ["OPEN", "IN_PROGRESS"] } }] }, include: { assignee: true }, orderBy: [{ dueDate: "asc" }] }),
    prisma.task.findMany({ where: { AND: [scope, { status: "DONE" }] }, include: { assignee: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
    isAdmin ? prisma.employee.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const overdue = openTasks.filter((t) => t.dueDate && t.dueDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const today = openTasks.filter((t) => t.dueDate && t.dueDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && t.dueDate <= todayEnd);
  const upcoming = openTasks.filter((t) => !t.dueDate || t.dueDate > todayEnd);

  const render = (t: (typeof openTasks)[number]) => (
    <TaskItem
      key={t.id}
      id={t.id}
      title={t.title}
      dueDate={t.dueDate ? t.dueDate.toISOString() : null}
      priority={t.priority}
      status={t.status}
      assignee={t.assignee?.name ?? null}
      notes={t.notes}
    />
  );

  return (
    <div>
      <PageHeader title="Tasks & Reminders" subtitle="Follow-ups for clients, candidates, interviews and payments." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>New Task</CardTitle></CardHeader>
          <CardContent><TaskForm assignees={assignees.map((a) => ({ id: a.id, label: a.name }))} /></CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-red-700">Overdue ({overdue.length})</CardTitle></CardHeader>
            <CardContent>{overdue.length === 0 ? <p className="text-sm text-muted-foreground">Nothing overdue. 🎉</p> : overdue.map(render)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Today ({today.length})</CardTitle></CardHeader>
            <CardContent>{today.length === 0 ? <p className="text-sm text-muted-foreground">No tasks due today.</p> : today.map(render)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Upcoming ({upcoming.length})</CardTitle></CardHeader>
            <CardContent>{upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming tasks.</p> : upcoming.map(render)}</CardContent>
          </Card>
          {doneTasks.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-muted-foreground">Completed</CardTitle></CardHeader>
              <CardContent>{doneTasks.map(render)}</CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
