// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/scan/runs/[id]/triage — HAGANE E2.S4a.
 *
 * Batch finding-triage mutation as OVERLAY records (the persisted run +
 * WORM evidence are never mutated). Body:
 *   { findingIds: string[1..100], status: TriageStatus, note?: string }
 * Every findingId must belong to the run (unknown ids reject the whole
 * batch — no partial silent writes). RBAC `executions:execute` (same
 * tier as running the scan); emits SCAN_FINDING_TRIAGE_BATCH.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';
import { getScanRunsStore } from '@/lib/scan-runs';
import {
  getTriageStore,
  isTriageStatus,
  MAX_TRIAGE_BATCH,
  MAX_TRIAGE_NOTE,
  type TriageOverlay,
} from '@/lib/scan-runs/triage';
import { resolveRequestOperator } from '@/lib/evidence/route-helpers';
import { createHash } from 'node:crypto';

const RUN_ID = /^r-[a-z0-9]+-[0-9a-f]{10}$/;
const FINDING_ID = /^[0-9a-f]{16}$/;

function hashOperator(raw: string | null): string {
  if (raw === null) return 'system';
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export const POST = withAuth(
  async (request: NextRequest, { params }) => {
    const runId = params?.id ?? '';
    if (!RUN_ID.test(runId)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
    }

    const { findingIds, status, note } = body as {
      findingIds?: unknown;
      status?: unknown;
      note?: unknown;
    };
    if (
      !Array.isArray(findingIds)
      || findingIds.length === 0
      || findingIds.length > MAX_TRIAGE_BATCH
      || findingIds.some((f) => typeof f !== 'string' || !FINDING_ID.test(f))
    ) {
      return NextResponse.json(
        { error: `findingIds must be 1..${MAX_TRIAGE_BATCH} finding ids` },
        { status: 400 },
      );
    }
    if (!isTriageStatus(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > MAX_TRIAGE_NOTE)) {
      return NextResponse.json(
        { error: `note must be a string ≤ ${MAX_TRIAGE_NOTE} chars` },
        { status: 400 },
      );
    }

    try {
      const run = await getScanRunsStore().getById(runId);
      if (run === null) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }
      const known = new Set(run.findings.map((f) => f.id));
      const unknown = (findingIds as string[]).filter((f) => !known.has(f));
      if (unknown.length > 0) {
        return NextResponse.json(
          { error: 'Unknown finding ids for this run', unknown },
          { status: 400 },
        );
      }

      const actor = hashOperator(resolveRequestOperator(request));
      const ts = new Date().toISOString();
      const overlays: TriageOverlay[] = (findingIds as string[]).map((findingId) => ({
        runId,
        findingId,
        status,
        ...(note !== undefined ? { note } : {}),
        actor,
        ts,
      }));
      await getTriageStore().appendBatch(overlays);

      void auditLog.scanFindingTriageBatch({
        user: actor,
        runId,
        count: overlays.length,
        status,
      });

      const triage = await getTriageStore().getForRun(runId);
      return NextResponse.json(
        { triage },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    } catch (err) {
      console.error('[scan-triage] batch failed:', err);
      return NextResponse.json({ error: 'Triage unavailable' }, { status: 500 });
    }
  },
  { resource: 'executions', action: 'execute' },
);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { Allow: 'POST, OPTIONS' } });
}
