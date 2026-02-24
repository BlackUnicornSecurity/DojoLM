/**
 * Next.js Configuration
 *
 * Phase 6: Polish & Deployment
 * - Bundle analysis with ANALYZE=true
 * - Performance optimizations
 * - Production-ready settings
 */

import type { NextConfig } from "next";

// Enable bundle analyzer when ANALYZE environment variable is set
const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? require("@next/bundle-analyzer")({
        enabled: true,
      })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = withBundleAnalyzer({
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Enable source maps in production for debugging
  productionBrowserSourceMaps: false,

  // Image optimization settings
  images: {
    // For static export compatibility (if needed)
    unoptimized: false,
  },

  // Compiler options for performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },

  // Experimental features for Next.js 15+
  experimental: {
    // Optimize CSS imports
    optimizeCss: true,
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
});

export default nextConfig;
