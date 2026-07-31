// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/aivss/aggregate — TICKET-G4-WIDGETS-API / ADR-0097 §11.
 *
 * Admin-gated read-only AIVSS rollup endpoint. Returns the closed
 * `AivssRollup` shape ({ byBand: Record<AivssBand, number>, totalScored })
 * keyed by a `?scope=` discriminator. Foundation-only: producers (scanner
 * + compliance) wire data in subsequent G.3 follow-up PRs; this PR returns
 * `emptyAivssRollup()` for ALL scopes so the route shape lands ahead of
 * consumer dashboards (e.g. G4-BUSHIDO-CONSUMER follow-up).
 *
 * Closed-enum (R-T1):
 *   - `?scope` set-membership over `['scanner', 'compliance', 'all']`
 *     (default = 'all'; rejects unknown values with 400)
 *
 * Body shape (locked): `{ scope: <value>, rollup: AivssRollup }`.
 *
 * Auth: admin-only (`withAuth({role:'admin'})`). Read-only GET → no CSRF.
 * Rate limiting follows the same middleware-layer convention as peer
 * compliance routes (`createApiHandler` is the only HOF that surfaces
 * a per-route rateLimit option; `withAuth` does not).
 *
 * Audit: read-only — emits NO WORM audit row → no `audit-overlay-consumers.md`
 * entry needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { emptyAivssRollup } from 'bu-tpi/compliance';

const SCOPES = ['scanner', 'compliance', 'all'] as const;
type AivssAggregateScope = (typeof SCOPES)[number];

function isAivssAggregateScope(value: string): value is AivssAggregateScope {
  return (SCOPES as readonly string[]).includes(value);
}

export const GET = withAuth(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const rawScope = searchParams.get('scope');

    if (rawScope !== null && !isAivssAggregateScope(rawScope)) {
      return NextResponse.json(
        { error: 'Invalid scope — expected "scanner", "compliance", or "all"' },
        { status: 400 },
      );
    }
    const scope: AivssAggregateScope = rawScope === null ? 'all' : rawScope;

    // Foundation-only: producer wiring (scanner + compliance) lands in
    // subsequent G.3 follow-up PRs. Until then, every scope returns the
    // canonical empty rollup so consumer dashboards can mount the route.
    const rollup = emptyAivssRollup();

    return NextResponse.json({ scope, rollup });
  },
  { role: 'admin' },
);
