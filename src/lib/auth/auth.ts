import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  isLocked,
  registerFailedAttempt,
  registerSuccessfulLogin,
} from "@/lib/auth/rate-limit";
import { writeAudit, AUDIT } from "@/lib/auth/audit";

/**
 * Auth.js (NextAuth v5) credentials auth (spec §29, §30).
 * - Argon2id password verification
 * - Account lockout on repeated failures
 * - JWT session carrying userId, role name and permission keys so the app can
 *   authorize cheaply, while sensitive mutations ALWAYS re-check server-side.
 * - httpOnly / Secure / SameSite cookies (NextAuth defaults; Secure in prod).
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      permissions: string[];
      employeeId: string | null;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
            employee: true,
          },
        });

        // Uniform failure (don't reveal whether the email exists).
        if (!user || !user.isActive) {
          await writeAudit({ action: AUDIT.LOGIN_FAILED, entity: "User", after: { email } });
          return null;
        }

        if (isLocked(user.lockedUntil)) {
          await writeAudit({ userId: user.id, action: AUDIT.LOGIN_FAILED, after: { reason: "locked" } });
          return null;
        }

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) {
          await registerFailedAttempt(user.id);
          await writeAudit({ userId: user.id, action: AUDIT.LOGIN_FAILED });
          return null;
        }

        await registerSuccessfulLogin(user.id);
        await writeAudit({ userId: user.id, action: AUDIT.LOGIN });

        const permissions = user.role.permissions.map((rp) => rp.permission.key);
        return {
          id: user.id,
          email: user.email,
          name: user.employee?.name ?? user.email,
          role: user.role.name,
          permissions,
          employeeId: user.employee?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        token.permissions = (user as { permissions: string[] }).permissions;
        token.employeeId = (user as { employeeId: string | null }).employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.employeeId = (token.employeeId as string | null) ?? null;
      }
      return session;
    },
  },
});
