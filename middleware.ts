import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware runs before every request
 * We protect /dashboard routes using tw_token cookie
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ ALWAYS ALLOW AUTH + API ROUTES
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 🔒 Protect dashboard routes only
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("tw_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

/**
 * Apply middleware ONLY to dashboard pages
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
