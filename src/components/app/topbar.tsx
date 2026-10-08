import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth/guards";
import { NotificationBell } from "./notification-bell";

/**
 * Slim top bar (desktop) holding the notification bell. On mobile the sidebar
 * renders its own top bar, so this is hidden on small screens.
 */
export async function Topbar() {
  const user = await currentUser();
  if (!user) return null;

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return (
    <div className="sticky top-0 z-20 hidden items-center justify-end border-b bg-navy px-6 py-2 md:flex">
      <NotificationBell
        unread={unread}
        items={items.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          link: n.link,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
