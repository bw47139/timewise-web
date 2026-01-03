import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware runs before every request
 * 🔐 Responsibility: AUTH ONLY
 * ❌ NO location / organization logic here
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --------------------------------------------------
  // ✅ Public routes (NO auth required)
  // --------------------------------------------------
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/health")
  ) {
    return NextResponse.next();
  }

  // --------------------------------------------------
  // 🔐 Protect dashboard routes with tw_token only
  // --------------------------------------------------
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("tw_token")?.value;

    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  // --------------------------------------------------
  // ✅ Allow request
  // --------------------------------------------------
  return NextResponse.next();
}

/**
 * Apply middleware ONLY to dashboard routes
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
