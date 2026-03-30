/**
 * D4.2 — Campaign CRUD (single campaign operations)
 * GET /api/sengoku/campaigns/[id]
 * PATCH /api/sengoku/campaigns/[id]
 * DELETE /api/sengoku/campaigns/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import fs from 'node:fs';
import path from 'node:path';
import type { Campaign, UpdateCampaignRequest, CampaignStatus } from '@/lib/sengoku-types';
import { validateSengokuWebhookUrl } from '@/lib/sengoku-webhook';
import { getDataPath } from '@/lib/runtime-paths';

const CAMPAIGNS_DIR = getDataPath('sengoku', 'campaigns');
const RUNS_DIR = getDataPath('sengoku', 'runs');
const SAFE_ID = /^[\w-]{1,128}$/;
const VALID_STATUSES: readonly CampaignStatus[] = ['draft', 'active', 'paused', 'completed', 'archived'];
const SAFE_NAME = /^[\w \-().]{1,200}$/;
const MAX_SKILLS = 100;

async function loadCampaign(id: string): Promise<Campaign | null> {
  try {
    const content = await fs.promises.readFile(path.join(CAMPAIGNS_DIR, `${id}.json`), 'utf-8');
    return JSON.parse(content) as Campaign;
  } catch {
    return null;
  }
}

async function saveCampaign(campaign: Campaign): Promise<void> {
  const filePath = path.join(CAMPAIGNS_DIR, `${campaign.id}.json`);
  const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
  await fs.promises.writeFile(tmpFile, JSON.stringify(campaign, null, 2));
  await fs.promises.rename(tmpFile, filePath);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
  }

  const campaign = await loadCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Include run history
  let runs: unknown[] = [];
  try {
    const runsDir = path.join(RUNS_DIR, id);
    const files = await fs.promises.readdir(runsDir);
    for (const f of files.filter((f) => f.endsWith('.json'))) {
      const content = await fs.promises.readFile(path.join(runsDir, f), 'utf-8');
      runs.push(JSON.parse(content));
    }
  } catch {
    // No runs yet
  }

  return NextResponse.json({ campaign, runs });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
  }

  const campaign = await loadCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const body = (await request.json()) as UpdateCampaignRequest;
  let normalizedWebhookUrl: string | null | undefined;

  // Validate name if provided
  if (body.name !== undefined && !SAFE_NAME.test(body.name)) {
    return NextResponse.json({ error: 'Invalid campaign name' }, { status: 400 });
  }

  // Validate webhookUrl if provided
  if (body.webhookUrl !== undefined && body.webhookUrl !== null) {
    const webhookValidation = await validateSengokuWebhookUrl(body.webhookUrl);
    if (!webhookValidation.valid) {
      return NextResponse.json({ error: webhookValidation.error }, { status: 400 });
    }
    normalizedWebhookUrl = webhookValidation.normalizedUrl ?? null;
  }
  if (body.webhookUrl === null) {
    normalizedWebhookUrl = null;
  }

  // Validate selectedSkillIds if provided
  if (body.selectedSkillIds !== undefined) {
    if (!Array.isArray(body.selectedSkillIds) || body.selectedSkillIds.length === 0) {
      return NextResponse.json({ error: 'At least one skill must be selected' }, { status: 400 });
    }
    if (body.selectedSkillIds.length > MAX_SKILLS) {
      return NextResponse.json({ error: `Maximum ${MAX_SKILLS} skills per campaign` }, { status: 400 });
    }
  }

  const updated: Campaign = {
    ...campaign,
    ...(body.name !== undefined && { name: String(body.name).slice(0, 200) }),
    ...(body.schedule !== undefined && { schedule: body.schedule }),
    ...(body.selectedSkillIds !== undefined && { selectedSkillIds: body.selectedSkillIds.map((s) => String(s).slice(0, 128)) }),
    ...(body.status !== undefined && VALID_STATUSES.includes(body.status) && { status: body.status }),
    ...(body.graph !== undefined && { graph: body.graph }),
    ...(body.webhookUrl !== undefined && { webhookUrl: normalizedWebhookUrl ? normalizedWebhookUrl.slice(0, 2048) : null }),
    updatedAt: new Date().toISOString(),
  };

  await saveCampaign(updated);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
  }

  const campaign = await loadCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const archived: Campaign = { ...campaign, status: 'archived', updatedAt: new Date().toISOString() };
  await saveCampaign(archived);
  return NextResponse.json({ status: 'archived' });
}
