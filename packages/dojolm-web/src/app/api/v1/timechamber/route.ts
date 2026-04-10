/**
 * File: route.ts
 * Purpose: Public v1 API route for TimeChamber (DEPRECATED — use /api/orchestrator)
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
    'Link': '</api/orchestrator/run>; rel="successor-version"',
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

    const { planId, modelId } = body as { planId?: string; modelId?: string };

    // Validate required: planId
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: planId (string)' },
        { status: 400 }
      );
    }

    if (planId.length > 128) {
      return NextResponse.json(
        { error: 'planId exceeds maximum length (128)' },
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

    // TimeChamber v1 — pull available attack types from bu-tpi
    try {
      const tcMod = await import(/* webpackIgnore: true */ 'bu-tpi/timechamber' as string);
      const TEMPORAL_ATTACK_TYPES = tcMod.TEMPORAL_ATTACK_TYPES;
      return NextResponse.json(
        {
          success: true,
          deprecated: true,
          sunset: SUNSET_DATE,
          migration: 'POST /api/orchestrator/run',
          data: {
            planId,
            modelId,
            availableTypes: [...TEMPORAL_ATTACK_TYPES],
            status: 'ready',
            message: 'DEPRECATED — migrate to POST /api/orchestrator/run before 2026-06-30',
          },
        },
        { status: 200, headers: deprecationHeaders() }
      );
    } catch {
      return NextResponse.json(
        { success: false, error: 'TimeChamber unavailable' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('v1 TimeChamber API error:', error);
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
