// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/members/leaderboard — Epic 4B.2 S4B.2.2.
 *
 * Returns a paginated snapshot of the anonymized member leaderboard
 * for the active season. The payload carries rank + handle + score +
 * belt + displayAs only — NEVER email, userId, raw submission content,
 * or per-match payloads (decision #4 of the E4B design decisions).
 *
 * Chain ordering (§15/§16 — inherited from E4B.1 magic-link route):
 *   1. Flag gate (MEMBERS_UI_ENABLED) read at request time → 503
 *      BEFORE auth. An anonymous probe must see the same 503 a
 *      signed-out member would, so the endpoint's existence is not
 *      disclosed when the surface is disabled. The outer `GET` export
 *      runs the check before delegating to the `withAuth`-wrapped
 *      inner handler.
 *   2. withAuth({ role: 'member' }) — admins pass via the existing
 *      role-hierarchy check; no special-case branch.
 *   3. Rate limit tier 'read'.
 *   4. Query-param validation (season / limit / offset). Fixed error
 *      strings keyed by `code`; caller-supplied values are NEVER
 *      reflected back in the error body (GATE_ERROR_MESSAGES
 *      discipline — Epic 10 prior art, PR #220). E4B.4 enforced:
 *      after schema validation passes, `isKnownSeason()` is called
 *      against the `MemberSeasonsSource` and any unknown slug
 *      returns 404 `{ error: 'unknown season', code: 'unknown-season' }`.
 *   5. Serve from the per-tuple TTL cache when fresh, otherwise ask
 *      the current `MemberScoreSource` for a fresh page and freeze it
 *      in the cache for up to `CACHE_TTL_MS`.
 *
 * Cache key intentionally excludes `viewerId`: the `entries[]` array
 * is viewer-independent by contract (decision #6 — cross-member
 * isolation, enforced on `MemberScoreSource.getLeaderboard` per
 * `lib/members/score-source.ts`). `viewerEntry` is recomputed per-
 * request by asking the source for the caller's row, so it is not
 * served from cache.
 *
 * Audit writes: none. Leaderboard reads are not auditable events
 * (per the E4B design decisions — the WORM audit chain covers
 * belt-promotion events and engagement mutations only). This is
 * deliberate; do not
 * add `auditLog.*` calls to this route without revisiting the
 * decision record.
 *
 * Performance note on cache hits: a cache hit on `entries[]` still
 * triggers a second `source.getLeaderboard(...)` call to recompute
 * `viewerEntry`. For the E4B.2 default `InMemoryScoreSource` this is
 * free. E4B.5 ledger-backed source implementations MUST make the
 * viewer-only path cheap (e.g., a dedicated single-row query keyed by
 * `viewerId`) or introduce a narrower `getViewerEntry` seam.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultFlagReader } from 'bu-tpi/flags';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import {
  ACTIVE_SEASON,
  getMemberScoreSource,
} from '@/lib/members/score-source';
import { isKnownSeason } from '@/lib/members/seasons-source';
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
const LEADERBOARD_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  'members-ui-disabled': 'members surface is not enabled',
  'invalid-query': 'invalid leaderboard query parameters',
  'unknown-season': 'unknown season',
  'rate-limited': 'too many requests',
  'internal-error': 'internal error',
});

const MIN_LIMIT = 1;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const MIN_OFFSET = 0;

/**
 * Season identifier schema. Kept deliberately narrow (alphanumeric +
 * dash) so an attacker cannot smuggle a giant or adversarial string
 * through the cache-key space. The seasons registry (E4B.4) will
 * produce ids that match this shape.
 */
const seasonSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9-]+$/);

const querySchema = z.object({
  season: seasonSchema.optional(),
  limit: z.coerce.number().int().min(MIN_LIMIT).max(MAX_LIMIT).optional(),
  offset: z.coerce.number().int().min(MIN_OFFSET).optional(),
  // E3.S5 (F-7-007 P0): `?page=N` alias. Coerced through the same
  // bounded-integer schema as the other leaderboard params; the route
  // body translates it into an offset only when `offset=` is absent so
  // existing audit fixtures + integration tests pinning offset=N keep
  // their semantics.
  page: z.coerce.number().int().min(1).optional(),
});

function flagOffResponse(): NextResponse {
  return NextResponse.json(
    {
      error: LEADERBOARD_ERROR_MESSAGES['members-ui-disabled'],
      code: 'MEMBERS_UI_DISABLED',
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

function invalidQueryResponse(): NextResponse {
  return NextResponse.json(
    {
      error: LEADERBOARD_ERROR_MESSAGES['invalid-query'],
      code: 'invalid-query',
    },
    { status: 400, headers: RESPONSE_HEADERS },
  );
}

function unknownSeasonResponse(): NextResponse {
  return NextResponse.json(
    {
      error: LEADERBOARD_ERROR_MESSAGES['unknown-season'],
      code: 'unknown-season',
    },
    { status: 404, headers: RESPONSE_HEADERS },
  );
}

function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: LEADERBOARD_ERROR_MESSAGES['rate-limited'],
      code: 'rate-limited',
    },
    { status: 429, headers: RESPONSE_HEADERS },
  );
}

function internalErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: LEADERBOARD_ERROR_MESSAGES['internal-error'],
      code: 'internal-error',
    },
    { status: 500, headers: RESPONSE_HEADERS },
  );
}

// ---------------------------------------------------------------------------
// TTL cache — process-local, per (season, limit, offset). viewerId is NOT
// part of the key; viewerEntry is recomputed per-request from the source.
// State + helpers live in `./cache` so the test-only reset hook can be
// exported without violating Next.js' route-file export validator.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Auth-gated inner handler. Rate limit + validation + cache live here so
// they run only AFTER auth has confirmed the caller is a member.
// ---------------------------------------------------------------------------

const protectedGet = withAuth(
  async (request: NextRequest, { user }) => {
    const rate = await checkRateLimit(request, 'read');
    if (!rate.allowed) return rateLimitResponse();

    const url = new URL(request.url);
    const rawQuery = {
      season: url.searchParams.get('season') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      offset: url.searchParams.get('offset') ?? undefined,
      page: url.searchParams.get('page') ?? undefined,
    };
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) return invalidQueryResponse();

    // `season` passed the `^[A-Za-z0-9-]+$` regex and is safe to echo
    // back in the 200 body. E4B.4 wired the seasons registry — the
    // `isKnownSeason()` gate below rejects any well-formed slug that
    // is not present in the `MemberSeasonsSource` (404) rather than
    // silently returning an empty page. When the caller omits
    // `season` the default is `ACTIVE_SEASON` which is guaranteed to
    // be known (the default `InMemorySeasonsSource` advertises it).
    const season = parsed.data.season ?? ACTIVE_SEASON;
    const limit = parsed.data.limit ?? DEFAULT_LIMIT;
    // E3.S5 (F-7-007 P0): page → offset translation. `offset=` wins when
    // both params are present so the existing offset-pinning tests keep
    // their semantics; otherwise `page=` translates to `(page-1)*limit`.
    const offset = parsed.data.offset ?? (
      typeof parsed.data.page === 'number' ? (parsed.data.page - 1) * limit : 0
    );

    if (!(await isKnownSeason(season))) return unknownSeasonResponse();

    try {
      const now = Date.now();
      const key = cacheKey(season, limit, offset);
      const hit = cacheGet(key, now);
      const source = getMemberScoreSource();

      if (hit) {
        // Recompute the viewer's own entry per-request; the cached
        // `entries[]` is viewer-independent so it can be reused.
        const viewerPage = await source.getLeaderboard({
          season,
          limit,
          offset,
          viewerId: user.id,
        });
        return NextResponse.json(
          {
            season,
            entries: hit.entries,
            totalEntries: hit.totalEntries,
            viewerEntry: viewerPage.viewerEntry,
            generatedAt: hit.generatedAt,
          },
          { status: 200, headers: RESPONSE_HEADERS },
        );
      }

      const page = await source.getLeaderboard({
        season,
        limit,
        offset,
        viewerId: user.id,
      });
      cacheSet(key, page, now);
      return NextResponse.json(
        {
          season: page.season,
          entries: page.entries,
          totalEntries: page.totalEntries,
          viewerEntry: page.viewerEntry,
          generatedAt: page.generatedAt,
        },
        { status: 200, headers: RESPONSE_HEADERS },
      );
    } catch (err) {
      console.error('[leaderboard] source error', err);
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
