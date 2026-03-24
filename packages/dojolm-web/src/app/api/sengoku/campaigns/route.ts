/**
 * D4.2 — Campaign CRUD API (list + create)
 * GET /api/sengoku/campaigns — list all campaigns
 * POST /api/sengoku/campaigns — create a new campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Campaign, CreateCampaignRequest } from '@/lib/sengoku-types';
import { validateSengokuWebhookUrl } from '@/lib/sengoku-webhook';

const CAMPAIGNS_DIR = path.join(process.cwd(), 'data', 'sengoku', 'campaigns');
const SAFE_NAME = /^[\w \-().]{1,200}$/;
const MAX_SKILLS = 100;

async function ensureDir() {
  await fs.promises.mkdir(CAMPAIGNS_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    await ensureDir();
    const files = await fs.promises.readdir(CAMPAIGNS_DIR);
    const campaigns: Campaign[] = [];

    for (const file of files.filter((f) => f.endsWith('.json'))) {
      try {
        const content = await fs.promises.readFile(path.join(CAMPAIGNS_DIR, file), 'utf-8');
        const campaign = JSON.parse(content) as Campaign;
        if (campaign.status !== 'archived') {
          campaigns.push(campaign);
        }
      } catch {
        // Skip corrupt files
      }
    }

    campaigns.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const body = (await request.json()) as CreateCampaignRequest;

    if (!body.name || !SAFE_NAME.test(body.name)) {
      return NextResponse.json({ error: 'Invalid campaign name' }, { status: 400 });
    }
    if (!body.targetUrl || typeof body.targetUrl !== 'string') {
      return NextResponse.json({ error: 'targetUrl is required' }, { status: 400 });
    }
    try {
      const parsed = new URL(body.targetUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return NextResponse.json({ error: 'targetUrl must use http or https' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'targetUrl must be a valid URL' }, { status: 400 });
    }
    if (!body.selectedSkillIds || !Array.isArray(body.selectedSkillIds) || body.selectedSkillIds.length === 0) {
      return NextResponse.json({ error: 'At least one skill must be selected' }, { status: 400 });
    }
    if (body.selectedSkillIds.length > MAX_SKILLS) {
      return NextResponse.json({ error: `Maximum ${MAX_SKILLS} skills per campaign` }, { status: 400 });
    }
    let normalizedWebhookUrl: string | null = null;
    if (body.webhookUrl) {
      const webhookValidation = await validateSengokuWebhookUrl(body.webhookUrl);
      if (!webhookValidation.valid) {
        return NextResponse.json({ error: webhookValidation.error }, { status: 400 });
      }
      normalizedWebhookUrl = webhookValidation.normalizedUrl ?? null;
    }

    const now = new Date().toISOString();
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      name: String(body.name).slice(0, 200),
      targetUrl: String(body.targetUrl).slice(0, 2048),
      authConfig: body.authConfig ?? {},
      selectedSkillIds: body.selectedSkillIds.map((s) => String(s).slice(0, 128)),
      schedule: body.schedule ?? null,
      webhookUrl: normalizedWebhookUrl ? normalizedWebhookUrl.slice(0, 2048) : null,
      status: 'draft',
      graph: body.graph,
      createdAt: now,
      updatedAt: now,
    };

    await ensureDir();
    const filePath = path.join(CAMPAIGNS_DIR, `${campaign.id}.json`);
    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(campaign, null, 2));
    await fs.promises.rename(tmpFile, filePath);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
