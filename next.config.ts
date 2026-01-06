import type { NextConfig } from "next";

/**
 * ------------------------------------------------------------
 * TimeWise – Next.js config (PRODUCTION SAFE)
 *
 * - Browser always calls /api/*
 * - Next.js proxies /api/* to backend
 * - Cookies stay on frontend origin
 * ------------------------------------------------------------
 */

const nextConfig: NextConfig = {
  output: "standalone",

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
