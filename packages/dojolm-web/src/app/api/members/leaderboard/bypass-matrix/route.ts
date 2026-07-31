// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/members/leaderboard/bypass-matrix — Epic 4B.3 S4B.3.2.
 *
 * Returns the anonymized technique × model bypass-rate heatmap for the
 * active season. The response body carries aggregate cells only
 * (`techniqueId`, `modelId`, `n`, `bypassCount`, `bypassRate`,
 * `wilsonLow`, `wilsonHigh`, `unranked` per cell) — NEVER member
 * handle, userId, email, submission id, prompt content, or per-
 * submission payload. Cross-member isolation is structural: the
 * aggregation choke-point is `buildBypassMatrix()`, which receives a
 * list of `(techniqueId, modelId, refusalClass)` tuples and returns
 * counts + rates only.
 *
 * Chain ordering (§15/§16 — inherited from E4B.1 + E4B.2):
 *   1. Flag gate (MEMBERS_UI_ENABLED) read at request time → 503
 *      BEFORE auth. An anonymous probe sees the same 503 a signed-out
 *      member would.
 *   2. withAuth({ role: 'member' }) — admins pass via the existing
 *      role-hierarchy check.
 *   3. Rate limit tier 'read'.
 *   4. Query-param validation (season). Fixed error strings keyed by
 *      `code`; caller-supplied values are NEVER reflected back in the
 *      error body. E4B.4 enforced: after schema validation passes,
 *      `isKnownSeason()` is called against the `MemberSeasonsSource`
 *      and any unknown slug returns 404 `{ error: 'unknown season',
 *      code: 'unknown-season' }`.
 *   5. Serve from the per-season TTL cache when fresh, otherwise ask
 *      the current `MemberSubmissionSource` for the submission list,
 *      aggregate via `buildBypassMatrix`, and cache the frozen matrix
 *      for up to `CACHE_TTL_MS`.
 *
 * Cache key is `season` only — the matrix is not paginated, and it is
 * viewer-independent by contract (decision #4/#6 — the viewerId
 * argument on `MemberSubmissionSource.listSubmissions` is consumed
 * ONLY for the source's internal authorization check).
 *
 * Audit writes: none. Bypass-matrix reads mirror the leaderboard —
 * not an auditable event (E4B-decisions.md).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultFlagReader } from 'bu-tpi/flags';
import { buildBypassMatrix } from 'bu-tpi/catalog';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { ACTIVE_SEASON } from '@/lib/members/score-source';
import { getMemberSubmissionSource } from '@/lib/members/submission-source';
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
const BYPASS_MATRIX_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  'members-ui-disabled': 'members surface is not enabled',
  'invalid-query': 'invalid bypass-matrix query parameters',
  'unknown-season': 'unknown season',
  'rate-limited': 'too many requests',
  'internal-error': 'internal error',
});

/**
 * Season identifier schema. Same shape as the E4B.2 leaderboard
 * endpoint — alphanumeric + dash, max 32 chars.
 */
const seasonSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9-]+$/);

const querySchema = z.object({
  season: seasonSchema.optional(),
});

function flagOffResponse(): NextResponse {
  return NextResponse.json(
    {
      error: BYPASS_MATRIX_ERROR_MESSAGES['members-ui-disabled'],
      code: 'MEMBERS_UI_DISABLED',
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

function invalidQueryResponse(): NextResponse {
  return NextResponse.json(
    {
      error: BYPASS_MATRIX_ERROR_MESSAGES['invalid-query'],
      code: 'invalid-query',
    },
    { status: 400, headers: RESPONSE_HEADERS },
  );
}

function unknownSeasonResponse(): NextResponse {
  return NextResponse.json(
    {
      error: BYPASS_MATRIX_ERROR_MESSAGES['unknown-season'],
      code: 'unknown-season',
    },
    { status: 404, headers: RESPONSE_HEADERS },
  );
}

function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: BYPASS_MATRIX_ERROR_MESSAGES['rate-limited'],
      code: 'rate-limited',
    },
    { status: 429, headers: RESPONSE_HEADERS },
  );
}

function internalErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: BYPASS_MATRIX_ERROR_MESSAGES['internal-error'],
      code: 'internal-error',
    },
    { status: 500, headers: RESPONSE_HEADERS },
  );
}

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
    };
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) return invalidQueryResponse();

    const season = parsed.data.season ?? ACTIVE_SEASON;

    if (!(await isKnownSeason(season))) return unknownSeasonResponse();

    try {
      const now = Date.now();
      const key = cacheKey(season);
      const hit = cacheGet(key, now);

      if (hit) {
        return NextResponse.json(
          { season, matrix: hit.matrix },
          { status: 200, headers: RESPONSE_HEADERS },
        );
      }

      const source = getMemberSubmissionSource();
      const submissions = await source.listSubmissions({
        season,
        viewerId: user.id,
      });
      const matrix = buildBypassMatrix(submissions);
      cacheSet(key, matrix, now);
      return NextResponse.json(
        { season, matrix },
        { status: 200, headers: RESPONSE_HEADERS },
      );
    } catch (err) {
      // Log a sanitized summary rather than the raw err object so the
      // E4B.5 WORM-backed source cannot accidentally emit connection
      // strings, tokens, or other sensitive fields into stdout via a
      // stringified error. Stack traces already stay server-side (the
      // response carries only `internalErrorResponse()`'s fixed body).
      console.error('[bypass-matrix] source error', {
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
//
// Deployment note: the `'read'` rate-limit tier uses a per-IP bucket
// when `TRUSTED_PROXY` is set + the proxy forwards `x-forwarded-for`
// faithfully (Caddy on the production host does). Without `TRUSTED_PROXY`, the
// fallback fingerprint collapses to `'unknown'` for headless callers,
// sharing one bucket across all automation. This is an availability
// risk for CI fixtures and scripted clients, not a security issue.
// Confirm `TRUSTED_PROXY` is set in every non-dev compose file.

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
): Promise<Response> {
  const flags = defaultFlagReader();
  if (!flags.isEnabled('MEMBERS_UI_ENABLED')) return flagOffResponse();
  return protectedGet(request, context);
}

// OPTIONS runs before the flag gate by design — CORS preflights do not
// require feature-flag-on state, and browsers will fail the preflight
// if an authenticated GET is required to answer it. The 503 on the
// GET path is the operative control when the flag is off.
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  });
}
