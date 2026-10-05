import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-secondary px-4 text-center">
      <p className="text-5xl font-bold text-gold-dark">403</p>
      <h1 className="text-xl font-semibold text-navy">Access denied</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        You don&apos;t have permission to view this page. If you believe this is a mistake, contact the
        administrator.
      </p>
      <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
        Back to dashboard
      </Link>
    </main>
  );
}
