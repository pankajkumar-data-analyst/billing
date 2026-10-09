import { requireUser } from "@/lib/auth/guards";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

/**
 * Layout for the private application. requireUser() enforces authentication on
 * the server for every page under (app) — middleware is only a fast-path.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar permissions={user.permissions} user={{ name: user.name, role: user.role }} />
      <div className="flex flex-1 flex-col bg-background">
        <Topbar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
