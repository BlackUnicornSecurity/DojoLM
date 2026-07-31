// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/members/bounty/belt-ledger — Epic 4B.5 S4B.5.2.
 *
 * Returns the caller's own belt-promotion history + the anonymized
 * global tier distribution + the caller's current belt/points. The
 * payload is viewer-dependent on `ownEntries` / `currentBelt` /
 * `currentPoints` (the only per-viewer fields) and viewer-independent
 * on `tierDistribution` (the global aggregate).
 *
 * Chain ordering (§15/§16 — inherited from E4B.1..E4B.4):
 *   1. Flag gate (MEMBERS_UI_ENABLED) read at request time → 503
 *      BEFORE auth. An anonymous probe sees the same 503 a signed-out
 *      member would.
 *   2. withAuth({ role: 'member' }) — admins pass via the existing
 *      role-hierarchy check.
 *   3. Rate limit tier 'read' (60 req / min). SWR polls + manual
 *      refresh throttled client-side to 1/10 s — well under budget.
 *   4. No query-param validation — the endpoint takes no params. The
 *      `ownEntries` slice is always the caller's own history; the
 *      `tierDistribution` is always the global aggregate.
 *   5. Serve `tierDistribution` from the global 60s TTL cache when
 *      fresh; recompute `ownEntries` + `currentBelt` + `currentPoints`
 *      per-request (they depend on `viewerId` and must not be shared).
 *
 * Cache key is the empty string (global) — `viewerId` is NEVER mixed
 * into the cache key. Doing so would defeat the viewer-independence
 * contract on `tierDistribution` (§9 — decision #6 cross-member
 * isolation).
 *
 * Chain verification: the in-module `verifyChain(entries, signingKey)`
 * helper in `belt-ledger-worm.ts` is exposed over HTTP at
 * `GET /api/members/bounty/belt-ledger/verify` (landed in E4B.6). This
 * route does NOT run the chain walk — the verify sibling is the public
 * integrity-check surface; this route handles the own-ledger + tier-
 * distribution read.
 *
 * Audit writes: NONE. Belt-ledger reads are not auditable events; the
 * `appendPromotion` call on the source implementation is the
 * auditable event, and it lives on the E4B.6 admin surface, not on
 * this route.
 *
 * CSRF: N/A — GET-only read endpoint. No state mutation path is
 * exposed over HTTP. The `withAuth` wrapper skips CSRF validation
 * via `{ skipCsrf: true }`, mirroring the other `/api/members/*` GET
 * routes (leaderboard, bypass-matrix, seasons).
 */

import { NextRequest, NextResponse } from 'next/server';
import { defaultFlagReader } from 'bu-tpi/flags';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { ACTIVE_SEASON, getMemberScoreSource } from '@/lib/members/score-source';
import {
  getMemberBeltLedgerSource,
  resolveBeltForPoints,
} from '@/lib/members/belt-ledger-source';
import { cacheGet, cacheKey, cacheSet } from './cache';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

/**
 * Fixed error strings keyed by `code`. Every 4xx/5xx body uses one of
 * these — never interpolates caller input. Mirrors the
 * LEADERBOARD_ERROR_MESSAGES / SEASONS_ERROR_MESSAGES discipline on
 * the sibling /api/members/* routes.
 */
const BELT_LEDGER_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  'service-not-configured': 'members surface is not enabled',
  'rate-limited': 'too many requests',
  'internal-error': 'internal error',
});

function flagOffResponse(): NextResponse {
  return NextResponse.json(
    {
      error: BELT_LEDGER_ERROR_MESSAGES['service-not-configured'],
      code: 'service-not-configured',
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: BELT_LEDGER_ERROR_MESSAGES['rate-limited'],
      code: 'rate-limited',
    },
    { status: 429, headers: RESPONSE_HEADERS },
  );
}

function internalErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: BELT_LEDGER_ERROR_MESSAGES['internal-error'],
      code: 'internal-error',
    },
    { status: 500, headers: RESPONSE_HEADERS },
  );
}

// ---------------------------------------------------------------------------
// Auth-gated inner handler. Rate limit + per-request computation live
// here so they only run after auth has confirmed the caller is a member.
// ---------------------------------------------------------------------------

const protectedGet = withAuth(
  async (request: NextRequest, { user }) => {
    const rate = await checkRateLimit(request, 'read');
    if (!rate.allowed) return rateLimitResponse();

    try {
      const now = Date.now();
      const key = cacheKey();
      const source = getMemberBeltLedgerSource();
      const scoreSource = getMemberScoreSource();

      // Per-request (viewer-dependent) fields: caller's own ledger
      // rows + their cumulative points + their current belt. Never
      // cached — the cache key excludes `viewerId` by design.
      const [signedEntries, leaderPage] = await Promise.all([
        source.listOwnEntries({ viewerId: user.id }),
        scoreSource.getLeaderboard({
          season: ACTIVE_SEASON,
          limit: 0,
          offset: 0,
          viewerId: user.id,
        }),
      ]);
      // Strip `userId` from the wire shape — the response is already
      // viewer-scoped (the caller authenticated as themselves), so the
      // field is redundant on the wire. The chain-pointer fields
      // `previousHash` + `entryHash` are preserved so an operator
      // running `verifyChain` on an exported response can check
      // integrity without server state.
      const ownEntries = signedEntries.map(
        ({ userId: _userId, ...rest }) => rest,
      );
      const currentPoints = leaderPage.viewerEntry?.score ?? 0;
      const currentBelt = resolveBeltForPoints(currentPoints);

      // Global (viewer-independent) field: tier distribution aggregate.
      // Cached globally for 60s.
      const hit = cacheGet(key, now);
      if (hit) {
        return NextResponse.json(
          {
            ownEntries,
            tierDistribution: hit.tierDistribution,
            currentBelt,
            currentPoints,
            generatedAt: new Date(now).toISOString(),
          },
          { status: 200, headers: RESPONSE_HEADERS },
        );
      }

      const tierDistribution = await source.getTierDistribution();
      const generatedAt = new Date(now).toISOString();
      cacheSet(key, tierDistribution, generatedAt, now);

      return NextResponse.json(
        {
          ownEntries,
          tierDistribution,
          currentBelt,
          currentPoints,
          generatedAt,
        },
        { status: 200, headers: RESPONSE_HEADERS },
      );
    } catch (err) {
      // Sanitized logging — no raw error, no entries, no signing key.
      console.error('[bounty] belt-ledger error', {
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
