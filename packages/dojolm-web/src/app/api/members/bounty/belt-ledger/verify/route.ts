// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/members/bounty/belt-ledger/verify — Epic 4B.6 S4B.6.5.
 *
 * Exposes the `verifyChain(entries, signingKey)` helper (shipped in
 * `belt-ledger-worm.ts` by E4B.5) over HTTP. Two authenticated callers
 * (member or admin) hitting this endpoint at the same point in time
 * receive **byte-identical** response bodies — the ledger is global,
 * the response carries no caller-dependent fields.
 *
 * Response shape (fixed, never varies by caller):
 *   {
 *     ok: boolean,
 *     firstInvalidIndex: number | null,
 *     totalEntries: number,
 *     verifiedAt: string,            // ISO-8601 UTC
 *   }
 *
 * Chain ordering (§15/§16 — inherited from E4B.1..E4B.5):
 *   1. Flag gate (MEMBERS_UI_ENABLED) read at request time -> 503
 *      BEFORE auth. An anonymous probe sees the same 503 a signed-out
 *      member would.
 *   2. withAuth({ role: 'member' }) -> admins pass via the existing
 *      role-hierarchy check; no separate admin-only verify endpoint.
 *   3. Rate limit tier 'read' (60 req / min).
 *   4. No query params. No request body. No validation step.
 *   5. Load the full ledger via `getMemberBeltLedgerSource().listAllEntries()`,
 *      pass into `verifyChain` with the signing key from
 *      `getBeltLedgerSigningKey()`, return a fixed-shape body.
 *
 * Viewer-independence contract (decision #6 / R-T3 extended):
 *   - No `viewerId` participates in the loaded entries or the response.
 *   - No per-viewer cache. Every caller triggers a fresh recompute; the
 *     chain walk is O(n) and inexpensive for the beta-cohort scale.
 *   - Stale answers would hide tamper, so the no-cache posture is the
 *     safe default here (unlike the main belt-ledger route which caches
 *     the tier-distribution aggregate).
 *
 * R-T3 WORM contract:
 *   - The endpoint is the public verification of the append-only belt
 *     ledger. Tampering any field of any entry -> `ok: false` +
 *     `firstInvalidIndex: <tampered-index>`. An empty ledger -> `ok: true`.
 *
 * Signing key handling:
 *   - Read via `getBeltLedgerSigningKey()` per call.
 *   - In production, the helper throws at read time if the env var is
 *     unset -> the route returns 500 / `internal-error`. The key never
 *     lands in the response, in any log line, or in any error body.
 *
 * Audit writes: NONE. A cheap chain-verification read is not an
 * auditable event; the `appendPromotion` call on the source is.
 *
 * CSRF: N/A — GET-only read endpoint. `withAuth` receives
 * `skipCsrf: true`, mirroring the main belt-ledger route + the other
 * `/api/members/*` GET routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { defaultFlagReader } from 'bu-tpi/flags';
import { withAuth } from '@/lib/auth/route-guard';
import { checkRateLimit } from '@/lib/api-handler';
import { getMemberBeltLedgerSource } from '@/lib/members/belt-ledger-source';
import { getBeltLedgerSigningKey, verifyChain } from '@/lib/members/belt-ledger-worm';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

/**
 * Fixed error strings keyed by `code`. Every 4xx/5xx body uses one of
 * these — never interpolates caller input. Mirrors the BELT_LEDGER /
 * LEADERBOARD / SEASONS _ERROR_MESSAGES discipline on the sibling
 * /api/members/* routes.
 */
const VERIFY_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  'service-not-configured': 'members surface is not enabled',
  'rate-limited': 'too many requests',
  'internal-error': 'internal error',
});

function flagOffResponse(): NextResponse {
  return NextResponse.json(
    {
      error: VERIFY_ERROR_MESSAGES['service-not-configured'],
      code: 'service-not-configured',
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: VERIFY_ERROR_MESSAGES['rate-limited'],
      code: 'rate-limited',
    },
    { status: 429, headers: RESPONSE_HEADERS },
  );
}

function internalErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: VERIFY_ERROR_MESSAGES['internal-error'],
      code: 'internal-error',
    },
    { status: 500, headers: RESPONSE_HEADERS },
  );
}

// ---------------------------------------------------------------------------
// Auth-gated inner handler. Rate limit + per-request computation live
// here so they only run after auth has confirmed the caller is a member
// (or an admin via the role-hierarchy pass-through).
// ---------------------------------------------------------------------------

const protectedGet = withAuth(
  async (request: NextRequest) => {
    const rate = await checkRateLimit(request, 'read');
    if (!rate.allowed) return rateLimitResponse();

    try {
      const source = getMemberBeltLedgerSource();
      const entries = await source.listAllEntries();
      const signingKey = getBeltLedgerSigningKey();
      const result = verifyChain(entries, signingKey);
      const verifiedAt = new Date().toISOString();

      return NextResponse.json(
        {
          ok: result.ok,
          firstInvalidIndex: result.firstInvalidIndex,
          totalEntries: entries.length,
          verifiedAt,
        },
        { status: 200, headers: RESPONSE_HEADERS },
      );
    } catch (err) {
      // Sanitized logging (rule §17) — no raw error, no entries, no
      // signing key, no file path.
      console.error('[bounty/verify] error', {
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
