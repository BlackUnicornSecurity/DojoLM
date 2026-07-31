// SPDX-License-Identifier: Apache-2.0
/**
 * Next.js Configuration
 *
 * Phase 6: Polish & Deployment
 * - Bundle analysis with ANALYZE=true
 * - Performance optimizations
 * - Production-ready settings
 */

import type { NextConfig } from "next";
import { captureBuildId } from "./scripts/capture-build-id";

export { captureBuildId };

// Minimal shape of the subset of webpack.Configuration we touch below.
// The full `webpack` package isn't a direct dependency, so we avoid
// importing its types.
type WebpackResolveShape = {
  resolve?: {
    extensionAlias?: Record<string, string[]>;
    [key: string]: unknown;
  };
  externals?: unknown;
  plugins?: unknown[];
  name?: string;
};

// Enable bundle analyzer when ANALYZE environment variable is set
const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? require("@next/bundle-analyzer")({
        enabled: true,
      })
    : (config: NextConfig) => config;

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
// E6.S4 — surface the deploy SHA + environment to the client bundle so the
// TopBar `<EnvChip>` can render PROD / STAGING / DEV plus a build-SHA
// tooltip without an extra runtime fetch. Both are optional: when unset
// the chip defaults to "DEV" with a "build SHA unavailable" tooltip,
// which is the correct posture for local `next dev`. Operators set these
// via their deploy tooling or CI/CD pipeline.
//
// `NEXT_PUBLIC_APP_ENV`  = "prod" | "staging" | "dev" (case-insensitive)
// `NEXT_PUBLIC_GIT_SHA`  = full git SHA (chip displays the first 7 chars)
//
// These keys are also enumerated in `src/lib/runtime-env.ts` so the
// runtime-env serializer pushes them into `window.__DOJOLM_RUNTIME_ENV`
// alongside the other public env vars (used by client components that
// hydrate after the initial paint). E8.S2 renamed the global from
// `__NODA_RUNTIME_ENV` (retired V1 brand) → `__DOJOLM_RUNTIME_ENV`.
const envChipBuildEnv = {
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? "",
  NEXT_PUBLIC_GIT_SHA:
    process.env.NEXT_PUBLIC_GIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    "",
};

const nextConfig: NextConfig = withBundleAnalyzer({
  // E13.S1 capture evidence must not reuse a stale `.next` directory from a
  // different source revision. The exact source HEAD is therefore embedded in
  // Next's immutable BUILD_ID and revalidated by the capture manifest.
  generateBuildId: async () => captureBuildId(),
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
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // P6 cold-boot fix (2026-07-11): `experimental.optimizeCss` REMOVED — it
  // requires the `critters` package, which has never been in any package.json
  // or lockfile, so the flag was dead config since the first commit. The P6
  // container battery observed `next dev --webpack` (dev:fast) crash on a
  // cold tree with "Cannot find module 'critters'"; `next build --webpack`
  // (the prod build) survived because the require is lazy, on the legacy
  // pages-router HTML post-process path (next/dist/server/post-process.js)
  // that App-Router prod output never exercises.

  // Keep native SQLite + optional ioredis dependency available in standalone
  // server output. `ioredis` is loaded via dynamic `require()` (RedisStore
  // L-01 rate-limit backend) so deployments without it gracefully fall back
  // to the in-memory store; marking it external prevents webpack from
  // failing the build when the package is intentionally absent.
  // In demo mode, exclude native modules entirely to prevent Vercel build failures.
  serverExternalPackages: isDemoMode ? [] : ["better-sqlite3", "ioredis"],

  // F-12: Turbopack config (Next.js 16 default bundler)
  turbopack: {},

  // E6.S4 — inline the EnvChip env-vars into the client bundle. Next.js
  // already inlines anything prefixed `NEXT_PUBLIC_` automatically; this
  // explicit `env` block additionally accepts the alternative SHA names
  // (`VERCEL_GIT_COMMIT_SHA` / `GIT_COMMIT_SHA`) so deploy environments
  // that already set those don't need a second variable.
  env: envChipBuildEnv,

  // Resolve `.js` specifiers to their `.ts` source files for the
  // TypeScript-ESM convention used by several src/lib/* module trees
  // (dojo-telemetry, dsr, budget, kill-switch, evidence). Required by
  // `next build --webpack` (and dev:fast); without this, webpack reports
  // "Can't resolve './jsonl-file-sink.js'" even though the .ts file is
  // present. ⚠ Turbopack resolves `.js`→`.ts` natively for STATIC imports
  // only — a `.js`-suffixed DYNAMIC `import()` breaks cold Turbopack dev
  // (P6 battery 2026-07-11, audit-logger.ts). Dynamic imports in shipped
  // src/ must be extensionless; enforced by the no-restricted-syntax rule
  // in eslint.config.mjs.
  webpack: (
    config: WebpackResolveShape,
    { isServer }: { isServer: boolean },
  ) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    // Mark `ioredis` as a runtime external on the server bundle so webpack
    // doesn't fail when the optional package is absent. The RedisStore
    // backend dynamic-requires it inside a try/catch and gracefully falls
    // back to in-memory when the require throws at runtime.
    if (isServer) {
      const existing = Array.isArray(config.externals)
        ? (config.externals as unknown[])
        : config.externals !== undefined
          ? [config.externals as unknown]
          : [];
      config.externals = [...existing, { ioredis: "commonjs ioredis" }];
    }
    // P1.1 — emit a webpack-bundle-analyzer JSON report (gzip sizes + per-module
    // source paths) for the CLIENT bundle when BUNDLE_STATS=1. Guarded so it has
    // ZERO effect on normal builds; the bundle-budget gate parses this report to
    // measure the Tatami Rail-shell + adapter footprint and prove the dynamic
    // panel split. `webpack-bundle-analyzer` is already present (transitive dep
    // of `@next/bundle-analyzer`).
    if (process.env.BUNDLE_STATS === "1" && !isServer) {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      const path = require("path");
      config.plugins = [
        ...(config.plugins ?? []),
        new BundleAnalyzerPlugin({
          analyzerMode: "json",
          reportFilename: path.resolve(
            process.cwd(),
            "bundle-stats.tatami.json",
          ),
          defaultSizes: "gzip",
          openAnalyzer: false,
          logLevel: "warn",
        }),
      ];
    }
    return config;
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
          // SEC-001 / M-4 (2026-06-18): the static `Allow: GET, POST, OPTIONS`
          // header was REMOVED. It stamped a misleading constant verb-set on
          // EVERY /api/* response (200s included) — an unauthenticated
          // route/verb-recon surface that did not even reflect a route's real
          // methods. The original SEC-001 intent ("signal TRACE unsupported")
          // is met by proxy.ts's explicit TRACE→405; legitimate method
          // advertisement is `Access-Control-Allow-Methods` on an allowlisted
          // CORS preflight (proxy.ts) and the per-route `Allow` each route sets
          // on its own RFC-7231 405. No blanket Allow header here.
        ],
      },
    ];
  },
});

export default nextConfig;
