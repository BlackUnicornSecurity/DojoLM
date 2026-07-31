// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/admin/tatami/health — admin diagnostic for the Tatami evidence store
 * (OSS, P2.5 / F-SRE). Surfaces the dev-store disk metric (F11 — "growth must not be
 * silent") + the SLO snapshot for the timed Tatami server ops, so nothing about
 * Tatami health is invisible.
 *
 * AUTH: admin-only via `withAuth({ role: 'admin' })` — the same gate every other
 * /api/admin/* route uses. This does the signed-cookie verify AND the DB
 * `validateSession` lookup, so a server-revoked admin session is rejected even while
 * its cookie HMAC is still mathematically valid (a hand-rolled `parseAndVerifySessionCookie`
 * gate would miss that). There is NO unauthenticated liveness tier here: this exposes
 * store internals (counts / bytes / latencies), not a container probe, so a weaker
 * session (no cookie / member / revoked) gets a flat 401 from the guard. A GET carries
 * no CSRF requirement (withAuth only enforces CSRF on state-mutating methods).
 *
 * The payload is counts + bytes + latencies ONLY — it never echoes a proof/case body,
 * id, org, or operator (the collector + the metrics snapshot both enforce that upstream).
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { collectTatamiStoreHealth } from '@/lib/tatami/health';
import { snapshotTatamiMetrics } from '@/lib/tatami/metrics';

const SECURE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

export const GET = withAuth(
  async () => {
    try {
      const store = await collectTatamiStoreHealth();
      const slo = snapshotTatamiMetrics();
      return NextResponse.json({ status: 'ok', store, slo }, { status: 200, headers: SECURE_HEADERS });
    } catch (err) {
      console.error('[tatami] health failed:', err);
      return NextResponse.json({ error: 'Tatami health unavailable' }, { status: 500, headers: SECURE_HEADERS });
    }
  },
  { role: 'admin' },
);
