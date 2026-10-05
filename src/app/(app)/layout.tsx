import { requireUser } from "@/lib/auth/guards";
import { Sidebar } from "@/components/app/sidebar";

/**
 * Layout for the private application. requireUser() enforces authentication on
 * the server for every page under (app) — middleware is only a fast-path.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar permissions={user.permissions} user={{ name: user.name, role: user.role }} />
      <main className="flex-1 bg-secondary/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
