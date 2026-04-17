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

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const nextConfig: NextConfig = withBundleAnalyzer({
  // Standalone output for Docker deployment (required by Dockerfile)
  // Disabled in demo mode — Vercel uses its own build adapter
  ...(isDemoMode ? {} : { output: "standalone" }),

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Disable X-Powered-By header (BUG-015 / Story 13.3)
  poweredByHeader: false,

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

  // Keep native SQLite dependency available in standalone server output.
  // In demo mode, exclude native modules entirely to prevent Vercel build failures.
  serverExternalPackages: isDemoMode ? [] : ['better-sqlite3'],

  // F-12: Turbopack config (Next.js 16 default bundler)
  turbopack: {},

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
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          // BUG-013 / Story 13.3: HSTS header
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // BUG-016 / Story 13.3: Permissions-Policy header
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // H-04: Content-Security-Policy is now set per-request by middleware.ts
          // with a cryptographic nonce — static CSP here has been removed.
        ],
      },
      // BUG-020 / Story 13.3: Cache-Control on API responses
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          // SEC-001: Signal allowed methods — helps clients understand TRACE is not supported
          {
            key: "Allow",
            value: "GET, POST, OPTIONS",
          },
        ],
      },
    ];
  },
});

export default nextConfig;
