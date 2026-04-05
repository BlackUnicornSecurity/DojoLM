/**
 * D4.2 — Campaign Run Trigger
 * POST /api/sengoku/campaigns/[id]/run
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Campaign, CampaignRun } from '@/lib/sengoku-types';
import { getDataPath } from '@/lib/runtime-paths';

const CAMPAIGNS_DIR = getDataPath('sengoku', 'campaigns');
const RUNS_DIR = getDataPath('sengoku', 'runs');
const SAFE_ID = /^[\w-]{1,128}$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
  }

  try {
    const content = await fs.promises.readFile(path.join(CAMPAIGNS_DIR, `${id}.json`), 'utf-8');
    const campaign = JSON.parse(content) as Campaign;

    if (campaign.status === 'archived') {
      return NextResponse.json({ error: 'Cannot run archived campaign' }, { status: 400 });
    }

    // Check for existing running run (concurrency guard)
    try {
      const runDir = path.join(RUNS_DIR, id);
      const existingFiles = await fs.promises.readdir(runDir);
      for (const f of existingFiles.filter((f) => f.endsWith('.json'))) {
        try {
          const runContent = await fs.promises.readFile(path.join(runDir, f), 'utf-8');
          const existingRun = JSON.parse(runContent) as CampaignRun;
          if (existingRun.status === 'running') {
            return NextResponse.json({ error: 'A run is already in progress for this campaign', runId: existingRun.id }, { status: 409 });
          }
        } catch {
          // Skip corrupt run files
        }
      }
    } catch {
      // No runs dir yet — first run
    }

    const runId = crypto.randomUUID();
    const run: CampaignRun = {
      id: runId,
      campaignId: id,
      startedAt: new Date().toISOString(),
      endedAt: null,
      status: 'running',
      skillResults: [],
      findingsSummary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    };

    const runDir = path.join(RUNS_DIR, id);
    await fs.promises.mkdir(runDir, { recursive: true });
    const runFile = path.join(runDir, `${runId}.json`);
    const tmpFile = `${runFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(run, null, 2));
    await fs.promises.rename(tmpFile, runFile);

    // Fire-and-forget execution
    // NOTE: Requires a long-lived Node.js process (not serverless/edge)
    import('@/lib/sengoku-executor')
      .then(({ executeCampaignRun }) =>
        executeCampaignRun(campaign, runId)
      )
      .catch(async (err) => {
        console.error(`Campaign run ${runId} failed:`, err instanceof Error ? err.message : err);
        // Mark run as failed only if it's still in 'running' state (avoid overwriting partial results)
        try {
          const currentContent = await fs.promises.readFile(runFile, 'utf-8');
          const currentRun = JSON.parse(currentContent) as CampaignRun;
          if (currentRun.status === 'running') {
            const failedRun: CampaignRun = {
              ...currentRun,
              status: 'failed',
              endedAt: new Date().toISOString(),
            };
            const failTmp = `${runFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
            await fs.promises.writeFile(failTmp, JSON.stringify(failedRun, null, 2));
            await fs.promises.rename(failTmp, runFile);
          }
        } catch {
          // Best effort — cannot update run file
        }
      });

    return NextResponse.json({ runId, status: 'running' }, { status: 202 });
  } catch {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
}
