// SPDX-License-Identifier: Apache-2.0
/**
 * D4.2 — Single run detail + cancel
 * GET /api/sengoku/campaigns/[id]/runs/[runId]
 * PATCH /api/sengoku/campaigns/[id]/runs/[runId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import fs from 'node:fs';
import path from 'node:path';
import type { CampaignRun } from '@/lib/sengoku-types';
import { getDataPath } from '@/lib/runtime-paths';

const RUNS_DIR = getDataPath('sengoku', 'runs');
const SAFE_ID = /^[\w-]{1,128}$/;

export const GET = withAuth(
  async (_request: NextRequest, { params }) => {
  const id = params?.id ?? '';
  const runId = params?.runId ?? '';
  if (!SAFE_ID.test(id) || !SAFE_ID.test(runId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const content = await fs.promises.readFile(path.join(RUNS_DIR, id, `${runId}.json`), 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }
  },
  { role: 'admin' },
);

export const PATCH = withAuth(
  async (_request: NextRequest, { params }) => {
  const id = params?.id ?? '';
  const runId = params?.runId ?? '';
  if (!SAFE_ID.test(id) || !SAFE_ID.test(runId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const filePath = path.join(RUNS_DIR, id, `${runId}.json`);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const run = JSON.parse(content) as CampaignRun;

    if (run.status !== 'running') {
      return NextResponse.json({ error: 'Can only cancel running campaigns' }, { status: 400 });
    }

    const cancelled: CampaignRun = {
      ...run,
      status: 'cancelled',
      endedAt: new Date().toISOString(),
    };

    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(cancelled, null, 2));
    await fs.promises.rename(tmpFile, filePath);

    return NextResponse.json(cancelled);
  } catch {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }
  },
  { role: 'admin' },
);
