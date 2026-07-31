// SPDX-License-Identifier: Apache-2.0
/**
 * D4.2 — List campaign runs
 * GET /api/sengoku/campaigns/[id]/runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoCampaignRunsGet } from '@/lib/demo/mock-api-handlers';
import { withAuth } from '@/lib/auth/route-guard';
import fs from 'node:fs';
import path from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';

const RUNS_DIR = getDataPath('sengoku', 'runs');
const SAFE_ID = /^[\w-]{1,128}$/;

export const GET = withAuth(
  async (_request: NextRequest, { params }) => {
  const id = params?.id ?? '';
  if (isDemoMode()) return demoCampaignRunsGet(id);

  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
  }

  try {
    const runDir = path.join(RUNS_DIR, id);
    const files = await fs.promises.readdir(runDir);
    const runs: unknown[] = [];

    for (const f of files.filter((f) => f.endsWith('.json'))) {
      try {
        const content = await fs.promises.readFile(path.join(runDir, f), 'utf-8');
        runs.push(JSON.parse(content));
      } catch {
        // Skip corrupt files
      }
    }

    runs.sort((a: any, b: any) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
    return NextResponse.json({ runs });
  } catch {
    return NextResponse.json({ runs: [] });
  }
  },
  { role: 'admin' },
);
