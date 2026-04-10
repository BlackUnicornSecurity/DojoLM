/**
 * File: route.ts
 * Purpose: Public v1 API route for benchmark execution (DEPRECATED — use /api/llm/batch-test)
 * Story: MUSUBI Phase 7.3, PR-4g.1 Deprecation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { SUNSET_DATE, deprecationHeaders } from '@/lib/v1-deprecation';

const SUCCESSOR = '/api/llm/batch-test';
const headers = () => deprecationHeaders(SUCCESSOR);

const AVAILABLE_SUITES = [
  'dojolm-bench-v1',
  'agentic-bench-v1',
  'rag-bench-v1',
  'harmbench-v1',
  'strongreject-v1',
] as const;

export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: headers() }
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400, headers: headers() }
      );
    }

    const { suiteId, modelId } = body as { suiteId?: string; modelId?: string };

    // Validate required: suiteId
    if (!suiteId || typeof suiteId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: suiteId (string)' },
        { status: 400, headers: headers() }
      );
    }

    if (suiteId.length > 128) {
      return NextResponse.json(
        { error: 'suiteId exceeds maximum length (128)' },
        { status: 413, headers: headers() }
      );
    }

    // Validate required: modelId
    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: modelId (string)' },
        { status: 400, headers: headers() }
      );
    }

    if (modelId.length > 128) {
      return NextResponse.json(
        { error: 'modelId exceeds maximum length (128)' },
        { status: 413, headers: headers() }
      );
    }

    // Benchmark v1 — DEPRECATED: use /api/llm/batch-test
    return NextResponse.json(
      {
        success: true,
        deprecated: true,
        sunset: SUNSET_DATE,
        migration: `POST ${SUCCESSOR}`,
        data: {
          suiteId,
          modelId,
          availableSuites: [...AVAILABLE_SUITES],
          status: 'ready',
          message: `DEPRECATED — migrate to POST ${SUCCESSOR} before 2026-06-30`,
        },
      },
      { status: 200, headers: headers() }
    );
  } catch (error) {
    console.error('v1 Benchmark API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: headers() }
    );
  }
}, { resource: 'executions', action: 'execute' });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Allow': 'POST, OPTIONS', 'Content-Type': 'application/json' },
  });
}
