import { signOut } from "@/lib/auth/auth";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { currentUser } from "@/lib/auth/guards";

// GET /logout — audit then clear the session and redirect to /login.
export async function GET() {
  const user = await currentUser();
  if (user) await writeAudit({ userId: user.id, action: AUDIT.LOGOUT });
  await signOut({ redirectTo: "/login" });
}
