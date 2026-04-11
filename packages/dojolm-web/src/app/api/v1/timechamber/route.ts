/**
 * File: route.ts
 * Purpose: Public v1 API route for TimeChamber (DEPRECATED — use /api/orchestrator)
 * Story: MUSUBI Phase 7.3, PR-4g.1 Deprecation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { SUNSET_DATE, deprecationHeaders } from '@/lib/v1-deprecation';

const SUCCESSOR = '/api/orchestrator/run';
const headers = () => deprecationHeaders(SUCCESSOR);

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

    const { planId, modelId } = body as { planId?: string; modelId?: string };

    // Validate required: planId
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: planId (string)' },
        { status: 400, headers: headers() }
      );
    }

    if (planId.length > 128) {
      return NextResponse.json(
        { error: 'planId exceeds maximum length (128)' },
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

    // TimeChamber v1 — pull available attack types from bu-tpi
    try {
      const tcMod = await import(/* webpackIgnore: true */ 'bu-tpi/timechamber' as string);
      const TEMPORAL_ATTACK_TYPES = tcMod.TEMPORAL_ATTACK_TYPES;
      return NextResponse.json(
        {
          success: true,
          deprecated: true,
          sunset: SUNSET_DATE,
          migration: `POST ${SUCCESSOR}`,
          data: {
            planId,
            modelId,
            availableTypes: [...TEMPORAL_ATTACK_TYPES],
            status: 'ready',
            message: `DEPRECATED — migrate to POST ${SUCCESSOR} before 2026-06-30`,
          },
        },
        { status: 200, headers: headers() }
      );
    } catch {
      return NextResponse.json(
        { success: false, error: 'TimeChamber unavailable' },
        { status: 503, headers: headers() }
      );
    }
  } catch (error) {
    console.error('v1 TimeChamber API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: headers() }
    );
  }
}, { resource: 'executions', action: 'execute', extraHeaders: headers() });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Allow': 'POST, OPTIONS', 'Content-Type': 'application/json' },
  });
}
