// timewise-web/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api",
  "/_next",
  "/favicon.ico",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ✅ Read auth cookie
  const token = req.cookies.get("tw_token")?.value;

  // ❌ No token → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Authenticated → allow
  return NextResponse.next();
}

/**
 * IMPORTANT:
 * Only protect dashboard routes
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
