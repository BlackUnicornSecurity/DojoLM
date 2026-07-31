// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/scan/runs/[id] — HAGANE E2.S1b.
 *
 * Full persisted scan-run record (bounded finding summaries with stable
 * ids — the `?findingId=` deep-link target). RBAC: `executions:read`.
 * Reads are NOT audit-logged (review #6).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { getScanRunsStore } from '@/lib/scan-runs';
import { getTriageStore } from '@/lib/scan-runs/triage';

const RUN_ID = /^r-[a-z0-9]+-[0-9a-f]{10}$/;

export const GET = withAuth(
  async (_request: NextRequest, { params }) => {
    const id = params?.id ?? '';
    if (!RUN_ID.test(id)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 });
    }
    try {
      const run = await getScanRunsStore().getById(id);
      if (run === null) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }
      // HAGANE E2.S4a — triage overlays ride the detail response
      // (additive key; the run record itself is never mutated).
      const triage = await getTriageStore().getForRun(id);
      return NextResponse.json(
        { run, triage },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    } catch (err) {
      console.error('[scan-runs] getById failed:', err);
      return NextResponse.json({ error: 'Scan run unavailable' }, { status: 500 });
    }
  },
  { resource: 'executions', action: 'read' },
);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { Allow: 'GET, OPTIONS' } });
}
