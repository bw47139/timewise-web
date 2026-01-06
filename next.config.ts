import type { NextConfig } from "next";

/**
 * ------------------------------------------------------------
 * Next.js config (CANONICAL — DO NOT DEVIATE)
 *
 * TimeWise Rules:
 * - Frontend ALWAYS calls /api/*
 * - Next.js proxies /api/* → backend Render service
 * - Cookies stay on frontend domain (timewise-web.onrender.com)
 * - Backend never exposed directly to browser
 * ------------------------------------------------------------
 */

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
