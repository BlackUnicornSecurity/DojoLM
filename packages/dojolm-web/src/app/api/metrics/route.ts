// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/metrics — Prometheus-compatible scrape endpoint.
 * Story: WAVE6-METRICS-PROMETHEUS / ADR-0051.
 *
 * Auth posture: the endpoint refuses to serve metrics unless
 * `METRICS_SCRAPE_TOKEN` is set (not empty) AND the incoming request
 * carries `Authorization: Bearer <token>` matching it via a
 * constant-time compare. Rationale:
 *   - An unguarded /metrics endpoint leaks per-feature call rates,
 *     budget rejections, and run durations — operational intel that
 *     aids an attacker's pivot decisions.
 *   - A bearer-token check matches Prometheus's native scrape config
 *     (`authorization:`), so operators don't need custom tooling.
 *   - We intentionally do NOT fall back to session auth; scrape
 *     traffic shouldn't need a browser session.
 *   - When the token env is unset, the endpoint returns 503 so a
 *     misconfigured deploy fails closed instead of leaking metrics.
 *
 * Response: `text/plain; version=0.0.4` per the Prometheus text
 * exposition spec; `Cache-Control: no-store`.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { renderMetrics } from '@/lib/metrics/registry'

const CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8'
const BEARER_PATTERN = /^Bearer\s+(.+)$/

function timingSafeEqualString(a: string, b: string): boolean {
  // CR HIGH (Wave 6 review) — early `length !== length` exit is a
  // timing side-channel: an attacker can binary-search the secret's
  // byte length by measuring response time against varying-length
  // candidates. Pad both sides to a uniform max byte length and
  // ALWAYS call timingSafeEqual, then AND the equality with a
  // length match so length mismatches still return false without
  // ever short-circuiting before the constant-time compare runs.
  const aBytes = Buffer.byteLength(a)
  const bBytes = Buffer.byteLength(b)
  const maxLen = Math.max(aBytes, bBytes, 1)
  const aBuf = Buffer.alloc(maxLen)
  const bBuf = Buffer.alloc(maxLen)
  Buffer.from(a).copy(aBuf)
  Buffer.from(b).copy(bBuf)
  const equalBytes = crypto.timingSafeEqual(aBuf, bBuf)
  return equalBytes && aBytes === bBytes
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const expected = process.env.METRICS_SCRAPE_TOKEN
  if (expected === undefined || expected.length === 0) {
    return NextResponse.json(
      { error: 'metrics scrape is not configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(BEARER_PATTERN)
  if (match === null) {
    return NextResponse.json(
      { error: 'metrics scrape requires Authorization: Bearer <token>' },
      { status: 401, headers: { 'Cache-Control': 'no-store', 'WWW-Authenticate': 'Bearer realm="metrics"' } },
    )
  }
  const provided = match[1].trim()
  if (!timingSafeEqualString(provided, expected)) {
    return NextResponse.json(
      { error: 'metrics scrape token mismatch' },
      { status: 401, headers: { 'Cache-Control': 'no-store', 'WWW-Authenticate': 'Bearer realm="metrics"' } },
    )
  }

  const body = renderMetrics()
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPE,
      'Cache-Control': 'no-store',
    },
  })
}
