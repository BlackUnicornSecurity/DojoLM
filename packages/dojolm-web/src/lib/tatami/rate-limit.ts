// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/rate-limit — M-3 per-caller write throttle for the Tatami POST routes.
 *
 * The capture / case-create / attach routes are RBAC-gated but otherwise unbounded — a
 * single authenticated caller can drive unlimited writes into the append-only stores.
 * This applies the platform's per-caller identity (`getClientIp` — trusted-proxy IP, or
 * an api-key / browser-fingerprint hash) to a token-bucket sized for ~60 writes/min, the
 * same backend the rest of the app's limiters use (`RATE_LIMIT_BACKEND=redis|memory`).
 *
 * Deliberately NOT on the OSS `lib/tatami` barrel: routes import it directly. It is a
 * route-layer concern, not part of the evidence-core surface.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createRateLimitStore } from '@/lib/rate-limit-store';
import { getClientIp } from '@/lib/api-handler';

/** ~60 writes/min/caller: 60-token bucket, refilled 1 token/sec. */
export const TATAMI_WRITE_RATE_LIMIT = { maxTokens: 60, refillRate: 1 } as const;

// Dedicated store so Tatami throttling neither depends on nor perturbs the platform
// limiter's buckets. Honours RATE_LIMIT_BACKEND like every other store.
const store = createRateLimitStore();

/**
 * Consume one Tatami write token for the request's caller. Returns `null` when the call
 * is allowed (proceed), or a ready-to-return 429 `NextResponse` (with `Retry-After`)
 * when the caller is over the limit.
 */
export async function enforceTatamiWriteRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  const key = `tatami-write:${getClientIp(request)}`;
  const result = await store.consume(key, TATAMI_WRITE_RATE_LIMIT);
  if (result.allowed) return null;

  const retryAfter = Math.max(1, Math.ceil(result.resetMs / 1000));
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

/** Test seam — clears the dedicated bucket so suites stay deterministic. */
export function __resetTatamiRateLimitForTests(): void {
  store.clear();
}
