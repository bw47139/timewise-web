import type { NextConfig } from "next";

/**
 * ------------------------------------------------------------
 * Next.js config
 *
 * IMPORTANT RULE (canonical for TimeWise):
 * - Browser code MUST call /api/*
 * - Next.js rewrites proxy /api/* to Render backend
 * - Cookies remain on frontend origin (localhost / prod domain)
 * ------------------------------------------------------------
 */

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://timewise-api-1.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
