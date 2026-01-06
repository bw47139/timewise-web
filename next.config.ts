import type { NextConfig } from "next";

/**
 * ------------------------------------------------------------
 * Next.js config (AUTHORITATIVE for TimeWise)
 *
 * RULES:
 * - Browser ALWAYS calls /api/*
 * - Next.js proxies /api/* → backend (Render)
 * - Backend URL comes from ENV (Render-safe)
 * ------------------------------------------------------------
 */

const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
