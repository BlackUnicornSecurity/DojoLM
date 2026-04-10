/**
 * File: route.ts
 * Purpose: Public v1 API route for benchmark execution (DEPRECATED — use /api/llm/batch-test)
 * Story: MUSUBI Phase 7.3, PR-4g.1 Deprecation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

const SUNSET_DATE = 'Sat, 30 Jun 2026 00:00:00 GMT';

function deprecationHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Sunset': SUNSET_DATE,
    'Deprecation': 'true',
    'Link': '</api/llm/batch-test>; rel="successor-version"',
  };
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const { suiteId, modelId } = body as { suiteId?: string; modelId?: string };

    // Validate required: suiteId
    if (!suiteId || typeof suiteId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: suiteId (string)' },
        { status: 400 }
      );
    }

    if (suiteId.length > 128) {
      return NextResponse.json(
        { error: 'suiteId exceeds maximum length (128)' },
        { status: 413 }
      );
    }

    // Validate required: modelId
    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: modelId (string)' },
        { status: 400 }
      );
    }

    if (modelId.length > 128) {
      return NextResponse.json(
        { error: 'modelId exceeds maximum length (128)' },
        { status: 413 }
      );
    }

    // Benchmark v1 — pull available suites from bu-tpi
    try {
      const benchMod = await import(/* webpackIgnore: true */ 'bu-tpi/benchmark' as string);
      const AGENTIC_BENCHMARK_SUITE = benchMod.AGENTIC_BENCHMARK_SUITE;
      return NextResponse.json(
        {
          success: true,
          deprecated: true,
          sunset: SUNSET_DATE,
          migration: 'POST /api/llm/batch-test',
          data: {
            suiteId,
            modelId,
            availableSuites: [
              'dojolm-bench-v1',
              'agentic-bench-v1',
              'rag-bench-v1',
              'harmbench-v1',
              'strongreject-v1',
            ],
            status: 'ready',
            message: 'DEPRECATED — migrate to POST /api/llm/batch-test before 2026-06-30',
          },
        },
        { status: 200, headers: deprecationHeaders() }
      );
    } catch {
      return NextResponse.json(
        { success: false, error: 'Benchmark unavailable' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('v1 Benchmark API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { resource: 'executions', action: 'execute' });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Allow': 'POST, OPTIONS', 'Content-Type': 'application/json' },
  });
}
