// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/members/seasons/archive/:slug — Epic 4B.4 S4B.4.2.
 *
 * Returns the archived-season snapshot: the season metadata, a
 * leaderboard snapshot, and a bypass-matrix snapshot. The payload is
 * anonymized-aggregate ONLY — rank + handle + belt + displayAs for
 * leaderboard rows; `(techniqueId, modelId, n, bypassCount,
 * bypassRate, wilsonLow, wilsonHigh, unranked)` for matrix cells.
 *
 * Chain ordering (§15/§16 — inherited from E4B.1..E4B.3):
 *   1. Flag gate (MEMBERS_UI_ENABLED) read at request time → 503
 *      BEFORE auth. An anonymous probe sees the same 503 a signed-out
 *      member would.
 *   2. withAuth({ role: 'member' }) — admins pass via the existing
 *      role-hierarchy check.
 *   3. Rate limit tier 'read'.
 *   4. Slug validation — `^[A-Za-z0-9-]{1,32}$` regex + registry
 *      lookup. Malformed slug → 400; well-formed but unknown → 404.
 *      Same double-gate discipline as E4B.3's hash routing.
 *   5. Serve from the per-slug 60s TTL cache when fresh, otherwise
 *      build the snapshot from the submission source + the score
 *      source and freeze it in the cache.
 *
 * Cache eviction inherits the MAX_CACHE_ENTRIES = 256 ceiling from
 * E4B.3's bypass-matrix cache. Archived seasons are immutable
 * (decision #3) so a longer TTL would be safe, but E4B.4 keeps the
 * 60s TTL for consistency — a follow-up sub-epic may raise it.
 *
 * Audit writes: none.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultFlagReader } from 'bu-tpi/flags';
import { buildBypassMatrix } from 'bu-tpi/catalog';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { getMemberScoreSource } from '@/lib/members/score-source';
import { getMemberSubmissionSource } from '@/lib/members/submission-source';
import { getMemberSeasonsSource } from '@/lib/members/seasons-source';
import { cacheGet, cacheKey, cacheSet, type ArchivePayload } from './cache';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const SEASONS_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  'members-ui-disabled': 'members surface is not enabled',
  'invalid-slug': 'invalid archive slug',
  'unknown-season': 'unknown season',
  'rate-limited': 'too many requests',
  'internal-error': 'internal error',
});

/**
 * Archive slug schema. Same alphanumeric + dash, max 32 chars regex
 * as the `season` query param on the leaderboard + bypass-matrix
 * endpoints (decision #2). Keeps round-trip URLs symmetric.
 *
 * The `[A-Za-z0-9-]` whitelist is strictly tighter than Epic 10's
 * `approverIdSchema` bidi/zero-width/format-char blacklist — every
 * character rejected there is also rejected here. Parity with that
 * audit requirement holds by construction.
 */
const slugSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9-]+$/);

function flagOffResponse(): NextResponse {
  return NextResponse.json(
    {
      error: SEASONS_ERROR_MESSAGES['members-ui-disabled'],
      code: 'MEMBERS_UI_DISABLED',
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

function invalidSlugResponse(): NextResponse {
  return NextResponse.json(
    {
      error: SEASONS_ERROR_MESSAGES['invalid-slug'],
      code: 'invalid-slug',
    },
    { status: 400, headers: RESPONSE_HEADERS },
  );
}

function unknownSeasonResponse(): NextResponse {
  return NextResponse.json(
    {
      error: SEASONS_ERROR_MESSAGES['unknown-season'],
      code: 'unknown-season',
    },
    { status: 404, headers: RESPONSE_HEADERS },
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
  async (request: NextRequest, { user, params }) => {
    const rate = await checkRateLimit(request, 'read');
    if (!rate.allowed) return rateLimitResponse();

    const rawSlug = params?.slug ?? '';
    const parsed = slugSchema.safeParse(rawSlug);
    if (!parsed.success) return invalidSlugResponse();
    const slug = parsed.data;

    try {
      const seasonsSource = getMemberSeasonsSource();
      const season = await seasonsSource.getSeason(slug);
      if (!season) return unknownSeasonResponse();

      const now = Date.now();
      const key = cacheKey(slug);
      const hit = cacheGet(key, now);
      if (hit) {
        return NextResponse.json(hit.payload, {
          status: 200,
          headers: RESPONSE_HEADERS,
        });
      }

      // Build the snapshot. The submission source + score source
      // return empty payloads today (E4B.2/E4B.3 defaults); when
      // E4B.5 lands the persistent ledger, these calls return real
      // historical data. The archive endpoint consumes whatever the
      // sources produce at snapshot time — no separate storage layer.
      const submissionSource = getMemberSubmissionSource();
      const submissions = await submissionSource.listSubmissions({
        season: slug,
        viewerId: null,
      });
      const bypassMatrix = buildBypassMatrix(submissions);

      const scoreSource = getMemberScoreSource();
      const page = await scoreSource.getLeaderboard({
        season: slug,
        limit: 200,
        offset: 0,
        viewerId: null,
      });

      const payload: ArchivePayload = Object.freeze({
        season,
        leaderboard: Object.freeze({
          entries: Object.freeze([...page.entries]) as readonly typeof page.entries[number][],
          totalEntries: page.totalEntries,
        }),
        bypassMatrix,
        generatedAt: new Date(now).toISOString(),
      });

      cacheSet(key, payload, now);
      return NextResponse.json(payload, {
        status: 200,
        headers: RESPONSE_HEADERS,
      });
    } catch (err) {
      console.error('[seasons-archive] source error', {
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
// Next.js passes the dynamic segment through `context.params`; we
// forward it into the withAuth-wrapped handler unchanged so the inner
// closure can read `params.slug`.
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const flags = defaultFlagReader();
  if (!flags.isEnabled('MEMBERS_UI_ENABLED')) return flagOffResponse();
  // withAuth awaits `context.params` and forwards a resolved plain
  // object into the inner handler. We pass the Next.js-shaped
  // `context` through unchanged — the HOF normalizes it.
  return protectedGet(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  });
}
