/**
 * K4.2 — Kagami Results Endpoint
 * GET /api/llm/fingerprint/results
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { getDataPath } from '@/lib/runtime-paths';
import fs from 'node:fs';
import path from 'node:path';

const SAFE_ID = /^[\w-]{1,128}$/;
const VALID_MODES = new Set(['identify', 'verify']);

function isValidResult(data: unknown): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.id === 'string' && typeof d.modelId === 'string' && typeof d.mode === 'string';
}

export async function GET(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const mode = searchParams.get('mode');

    if (modelId && !SAFE_ID.test(modelId)) {
      return NextResponse.json({ error: 'Invalid modelId' }, { status: 400 });
    }
    if (mode && !VALID_MODES.has(mode)) {
      return NextResponse.json({ error: 'Invalid mode, must be identify or verify' }, { status: 400 });
    }

    const resultsDir = getDataPath('llm-results', 'fingerprint');

    let files: string[] = [];
    try {
      files = await fs.promises.readdir(resultsDir);
    } catch {
      return NextResponse.json({ results: [] });
    }

    const results: Record<string, unknown>[] = [];
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      try {
        const content = await fs.promises.readFile(path.join(resultsDir, file), 'utf-8');
        const data = JSON.parse(content);
        if (!isValidResult(data)) continue;
        if (modelId && data.modelId !== modelId) continue;
        if (mode && data.mode !== mode) continue;
        results.push(data);
      } catch {
        // Skip corrupt files
      }
    }

    results.sort((a: any, b: any) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list results' }, { status: 500 });
  }
}
