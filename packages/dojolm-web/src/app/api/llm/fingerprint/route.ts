/**
 * K4.1 — Kagami Fingerprint Execute Endpoint
 * POST /api/llm/fingerprint
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { fileStorage } from '@/lib/storage/file-storage';
import { getProviderAdapter } from '@/lib/llm-providers';
import { KagamiEngine, loadKagamiSignatures } from 'bu-tpi/fingerprint';
import type { KagamiMode, ProbePresetName, ProbeCategory } from 'bu-tpi/fingerprint';
import { activeFingerprints } from '@/lib/fingerprint-state';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SAFE_ID = /^[\w-]{1,128}$/;
const VALID_MODES: readonly string[] = ['identify', 'verify'];
const VALID_PRESETS: readonly string[] = ['quick', 'standard', 'full', 'verify', 'stealth'];
const VALID_CATEGORIES = new Set([
  'self-disclosure', 'capability', 'knowledge-boundary', 'safety-boundary',
  'style-analysis', 'parameter-sensitivity', 'timing-latency', 'tokenizer',
  'multi-turn', 'censorship', 'api-metadata', 'watermark', 'multimodal',
  'context-window', 'fine-tuning', 'quantization', 'model-lineage',
]);

// In-memory rate limiter — 5 fingerprint runs per minute per IP
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every((t) => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key);
    }
  }
  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}

export async function POST(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded — try again later' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { modelId, mode, preset, expectedModelId, categories } = body as {
      modelId?: string;
      mode?: string;
      preset?: string;
      expectedModelId?: string;
      categories?: unknown[];
    };

    if (!modelId || !SAFE_ID.test(modelId)) {
      return NextResponse.json({ error: 'Invalid modelId' }, { status: 400 });
    }
    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode, must be identify or verify' }, { status: 400 });
    }
    if (preset && !VALID_PRESETS.includes(preset)) {
      return NextResponse.json({ error: 'Invalid preset' }, { status: 400 });
    }
    if (mode === 'verify' && (!expectedModelId || !SAFE_ID.test(expectedModelId))) {
      return NextResponse.json({ error: 'verify mode requires valid expectedModelId' }, { status: 400 });
    }

    // Validate categories if provided
    let validatedCategories: string[] | undefined;
    if (categories) {
      if (!Array.isArray(categories)) {
        return NextResponse.json({ error: 'categories must be an array' }, { status: 400 });
      }
      validatedCategories = categories
        .filter((c): c is string => typeof c === 'string' && VALID_CATEGORIES.has(c))
        .slice(0, VALID_CATEGORIES.size);
      if (validatedCategories.length === 0) {
        return NextResponse.json({ error: 'No valid categories provided' }, { status: 400 });
      }
    }

    const models = await fileStorage.getModelConfigs();
    const modelConfig = models.find((m) => m.id === modelId);
    if (!modelConfig) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const adapter = await getProviderAdapter(modelConfig.provider);
    const signatures = loadKagamiSignatures();
    const engine = new KagamiEngine(adapter, signatures);

    const runId = crypto.randomUUID();
    const session = activeFingerprints.create(runId);

    const onProgress = (p: import('bu-tpi/fingerprint').KagamiProgress) => {
      activeFingerprints.update(runId, p);
    };

    const options = {
      mode: mode as KagamiMode,
      preset: (preset ?? 'standard') as ProbePresetName,
      ...(validatedCategories ? { probeCategories: validatedCategories as ProbeCategory[] } : {}),
    };

    let result: unknown;
    if (mode === 'identify') {
      result = await engine.identify(modelConfig, options, onProgress);
    } else {
      result = await engine.verify(modelConfig, expectedModelId!, options, onProgress);
    }

    activeFingerprints.complete(runId, result);

    // Persist result
    const resultsDir = path.join(process.cwd(), 'data', 'llm-results', 'fingerprint');
    await fs.promises.mkdir(resultsDir, { recursive: true });
    const resultFile = path.join(resultsDir, `${runId}.json`);
    const tmpFile = `${resultFile}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, JSON.stringify({ id: runId, modelId, mode, preset, result, createdAt: new Date().toISOString() }, null, 2));
    await fs.promises.rename(tmpFile, resultFile);

    return NextResponse.json({ id: runId, ...result as object });
  } catch (error) {
    console.error('Fingerprint execution error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
