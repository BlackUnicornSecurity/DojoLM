// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/members/seasons — Epic 4B.4 S4B.4.2.
 *
 * Returns the seasons registry — the active season (or `null` if the
 * registry is empty) plus the list of archived seasons. The payload
 * is viewer-independent by contract (decision #6 — cross-member
 * isolation); the cache key is the empty string.
 *
 * Chain ordering (§15/§16 — inherited from E4B.1..E4B.3):
 *   1. Flag gate (MEMBERS_UI_ENABLED) read at request time → 503
 *      BEFORE auth. An anonymous probe sees the same 503 a signed-out
 *      member would.
 *   2. withAuth({ role: 'member' }) — admins pass via the existing
 *      role-hierarchy check.
 *   3. Rate limit tier 'read'.
 *   4. No query-param validation — the list is parameter-free.
 *   5. Serve from the global 60s TTL cache when fresh, otherwise ask
 *      the current `MemberSeasonsSource` and freeze the payload in
 *      the cache for up to `CACHE_TTL_MS`.
 *
 * Audit writes: none. Seasons reads mirror the leaderboard — not an
 * auditable event (E4B-decisions.md). The admin rollover event is
 * auditable, but that lands in a later sub-epic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { defaultFlagReader } from 'bu-tpi/flags';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { getMemberSeasonsSource } from '@/lib/members/seasons-source';
import { cacheGet, cacheKey, cacheSet } from './cache';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

/**
 * Fixed error strings keyed by `code`. Every 4xx/5xx body uses one
 * of these — never interpolates caller input.
 */
const SEASONS_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  'members-ui-disabled': 'members surface is not enabled',
  'rate-limited': 'too many requests',
  'internal-error': 'internal error',
});

function flagOffResponse(): NextResponse {
  return NextResponse.json(
    {
      error: SEASONS_ERROR_MESSAGES['members-ui-disabled'],
      code: 'MEMBERS_UI_DISABLED',
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: SEASONS_ERROR_MESSAGES['rate-limited'],
      code: 'rate-limited',
    },
    { status: 429, headers: RESPONSE_HEADERS },
  );
}

function internalErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: SEASONS_ERROR_MESSAGES['internal-error'],
      code: 'internal-error',
    },
    { status: 500, headers: RESPONSE_HEADERS },
  );
}

// ---------------------------------------------------------------------------
// Auth-gated inner handler.
// ---------------------------------------------------------------------------

const protectedGet = withAuth(
  async (request: NextRequest) => {
    const rate = await checkRateLimit(request, 'read');
    if (!rate.allowed) return rateLimitResponse();

    try {
      const now = Date.now();
      const key = cacheKey();
      const hit = cacheGet(key, now);

      if (hit) {
        return NextResponse.json(hit.payload, {
          status: 200,
          headers: RESPONSE_HEADERS,
        });
      }

      const source = getMemberSeasonsSource();
      const seasons = await source.listSeasons();
      const active = seasons.find((s) => s.status === 'active') ?? null;
      const archives = seasons.filter((s) => s.status === 'archived');
      const payload = Object.freeze({
        active,
        archives: Object.freeze([...archives]) as readonly typeof archives[number][],
        generatedAt: new Date(now).toISOString(),
      });
      cacheSet(key, payload, now);

      return NextResponse.json(payload, {
        status: 200,
        headers: RESPONSE_HEADERS,
      });
    } catch (err) {
      console.error('[seasons] source error', {
        name: err instanceof Error ? err.name : undefined,
        message: err instanceof Error ? err.message : String(err),
      });
      return internalErrorResponse();
    }
  },
  // skipCsrf: GET-only endpoint — no state mutation, double-submit
  // cookie pattern not needed.
  { role: 'member', skipCsrf: true },
);

// ---------------------------------------------------------------------------
// Public GET — flag gate first, then the auth-gated handler.
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
): Promise<Response> {
  const flags = defaultFlagReader();
  if (!flags.isEnabled('MEMBERS_UI_ENABLED')) return flagOffResponse();
  return protectedGet(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  });
}
