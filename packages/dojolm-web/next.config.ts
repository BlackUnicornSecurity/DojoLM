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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-eval only needed for Next.js dev server HMR
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self'",
              // style-src 'unsafe-inline' required: Next.js/Tailwind injects inline styles at runtime
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              // All LLM API calls are server-side proxied; browser only talks to local server
              "connect-src 'self'",
              // Story 13.7: frame-ancestors 'none' to prevent clickjacking
              "frame-ancestors 'none'",
              "frame-src 'self'",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Story 13.7: upgrade-insecure-requests — only when explicitly enabled via NODA_FORCE_HTTPS
              // BUG-031 fix: was NODE_ENV-gated, breaking HTTP deployments
              ...(process.env.NODA_FORCE_HTTPS === "true" ? ["upgrade-insecure-requests"] : []),
            ].join("; "),
          },
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
