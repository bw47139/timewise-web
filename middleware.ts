import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware runs before every request
 * We protect /dashboard routes using tw_token cookie
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes (no auth required)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("tw_token")?.value;

    // ❌ No token → redirect to login
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ✅ Allow request
  return NextResponse.next();
}

/**
 * Apply middleware only to these paths
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
