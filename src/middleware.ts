import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware — the FIRST (not only) line of defence.
 *
 * It redirects unauthenticated users away from the private app to /login by
 * checking for the presence of a session cookie. This is intentionally light:
 * real authorization (role/permission checks, row scoping) happens server-side
 * in every page/action via lib/auth/guards. Middleware never grants access —
 * it only short-circuits obvious unauthenticated requests.
 */

const PUBLIC_PATHS = ["/login", "/403", "/api/auth"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// NextAuth v5 sets either of these cookie names (secure prefix in prod).
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((c) => req.cookies.has(c));
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)"],
};
