/**
 * File: route.ts
 * Purpose: Build metadata endpoint at /api/build-info
 * Story: VIS-17 — Admin → General currently shows "UNKNOWN" for platform version.
 *        Expose the git SHA + build timestamp baked in at `docker build` time
 *        (see deploy/deploy-dojo.sh → --build-arg BUILD_SHA / BUILD_DATE and
 *        packages/dojolm-web/Dockerfile → ARG/ENV BUILD_SHA/BUILD_DATE).
 *
 * Shape: { sha, date, version, environment }
 * - sha: short git SHA (unknown if build-arg missing)
 * - date: UTC ISO timestamp of the build (unknown if build-arg missing)
 * - version: package.json version (read at module load)
 * - environment: 'production' | 'development' | 'test'
 *
 * This is intentionally public — all values are already visible in the
 * compiled JS bundle and don't leak sensitive data. No auth gate.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read version at module load — safe for server-side API route
let appVersion = '0.1.0'
try {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
  appVersion = pkg.version || appVersion
} catch {
  /* fallback to default */
}

export async function GET() {
  const sha = process.env.BUILD_SHA && process.env.BUILD_SHA !== 'unknown'
    ? process.env.BUILD_SHA
    : null
  const date = process.env.BUILD_DATE && process.env.BUILD_DATE !== 'unknown'
    ? process.env.BUILD_DATE
    : null

  return NextResponse.json(
    {
      sha,
      date,
      version: appVersion,
      environment: process.env.NODE_ENV ?? 'development',
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=60',
      },
    },
  )
}
