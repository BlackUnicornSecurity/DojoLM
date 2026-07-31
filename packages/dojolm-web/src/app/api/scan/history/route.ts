// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/scan/history — HAGANE E2.S1b.
 *
 * Newest-first scan-run summaries (operator scan history; audit C3).
 * RBAC: `executions:read` via withAuth (admin + operator). Reads are
 * NOT audit-logged (plan v1.1, review #6 — only mutations emit audit
 * events; the runs themselves were audit-logged at SCAN_EXECUTED).
 *
 * Query:
 *   - limit  1..100 (default 20)
 *   - before exclusive run-id cursor (validated against the run-id
 *            grammar; unknown cursor degrades to first page)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { getScanRunsStore } from '@/lib/scan-runs';

const RUN_ID = /^r-[a-z0-9]+-[0-9a-f]{10}$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const GET = withAuth(
  async (request: NextRequest) => {
    const { searchParams } = request.nextUrl;
    const rawLimit = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT));
    const beforeRaw = searchParams.get('before');
    if (beforeRaw !== null && !RUN_ID.test(beforeRaw)) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
    }

    try {
      const runs = await getScanRunsStore().list({
        limit,
        ...(beforeRaw !== null ? { before: beforeRaw } : {}),
      });
      return NextResponse.json(
        { runs },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    } catch (err) {
      console.error('[scan-history] list failed:', err);
      return NextResponse.json({ error: 'Scan history unavailable' }, { status: 500 });
    }
  },
  { resource: 'executions', action: 'read' },
);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { Allow: 'GET, OPTIONS' } });
}
