import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Documents module. The data model (Document) and security approach (private
 * storage + signed URLs, never public) are in place. Secure file UPLOAD is a
 * Phase-1.5/2 item requiring Vercel Blob / R2 wiring — see README. This page
 * documents the intended behaviour so nothing is misrepresented as done.
 */
export default async function DocumentsPage() {
  await requirePermission(PERMISSIONS.DOCUMENT_VIEW);
  return (
    <div>
      <PageHeader title="Documents" subtitle="Secure document storage." />
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-navy">Secure storage is scaffolded, uploads land in Phase 2.</p>
          <p>
            The database model and permission model for documents are in place. File uploads require a
            private blob store (Vercel Blob or Cloudflare R2) with signed-URL access — this is wired up in
            Phase 2 so documents are never served from public URLs. See the README for the storage plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
