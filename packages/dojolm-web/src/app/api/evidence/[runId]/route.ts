// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/evidence/[runId] — read back every envelope for a run (PR-4).
 *
 * Admin-gated. Returns the oldest-first envelope list plus reconciliation
 * totals (overall + per-surface) so a run's claimed coverage can be checked
 * against its actual evidence (CONT-R2-010/022). Read survives refresh and
 * re-login because it reads from durable storage, not component state.
 */
import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/auth/route-guard';
import { getStorage } from '@/lib/storage/storage-interface';

const RUN_ID_RE = /^[\w.:-]{1,200}$/;

export const GET = withAuth(
  async (_request: NextRequest, { params }) => {
    const runId = params?.runId ?? '';
    if (!RUN_ID_RE.test(runId)) {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }

    try {
      const storage = await getStorage();
      const envelopes = await storage.listEvidenceEnvelopes(runId);
      const bySurface: Record<string, number> = {};
      for (const e of envelopes) {
        bySurface[e.surface] = (bySurface[e.surface] ?? 0) + 1;
      }
      return NextResponse.json({
        runId,
        total: envelopes.length,
        bySurface,
        envelopes,
      });
    } catch (error) {
      console.error(
        '[evidence] read failed:',
        error instanceof Error ? error.message : 'unknown',
      );
      return NextResponse.json({ error: 'server' }, { status: 500 });
    }
  },
  { role: 'admin' },
);
