/**
 * File: api/compliance/frameworks/route.ts
 * Purpose: GET /api/compliance/frameworks — List all compliance frameworks with metadata
 * Proxies the framework list from /api/compliance, adding OPTIONS preflight support.
 * Index:
 * - OPTIONS handler (line ~30)
 * - GET handler (line ~36)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'
import { demoComplianceFrameworksGet } from '@/lib/demo/mock-api-handlers'
import { checkApiAuth } from '@/lib/api-auth'
import { getClientIp } from '@/lib/api-handler'
import { getConfiguredAppOrigin } from '@/lib/request-origin'

// In-memory rate limiter — 30 requests per minute per IP
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every((t) => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key);
    }
  }
  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, OPTIONS',
    },
  })
}

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoComplianceFrameworksGet()
  const authError = checkApiAuth(request)
  if (authError) return authError

  // TRUSTED_PROXY-gated IP extraction — prevents XFF spoofing in non-proxy topologies.
  const ip = getClientIp(request);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — try again later' },
      { status: 429 },
    )
  }

  try {
    // Use the configured app origin (server env var) — never trust the Host header
    const appOrigin = getConfiguredAppOrigin()
    if (!appOrigin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    const complianceUrl = new URL('/api/compliance', appOrigin)

    // Forward baiss and dynamic query params if provided
    const baiss = request.nextUrl.searchParams.get('baiss')
    const dynamic = request.nextUrl.searchParams.get('dynamic')
    if (baiss !== null) complianceUrl.searchParams.set('baiss', baiss)
    if (dynamic !== null) complianceUrl.searchParams.set('dynamic', dynamic)

    const complianceRes = await fetch(complianceUrl.toString(), {
      headers: {
        // Forward auth header
        ...(request.headers.get('x-api-key')
          ? { 'x-api-key': request.headers.get('x-api-key')! }
          : {}),
        ...(request.headers.get('authorization')
          ? { authorization: request.headers.get('authorization')! }
          : {}),
      },
    })

    if (!complianceRes.ok) {
      return NextResponse.json(
        { error: 'Failed to load compliance data' },
        { status: complianceRes.status }
      )
    }

    const data = await complianceRes.json()

    return NextResponse.json({
      frameworks: data.frameworks ?? [],
      summary: data.summary ?? {},
      lastUpdated: data.lastUpdated ?? new Date().toISOString(),
    })
  } catch (error) {
    console.error('Compliance frameworks error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve frameworks' },
      { status: 500 }
    )
  }
}
