/**
 * File: route.ts
 * Purpose: Public v1 API route for Sengoku campaigns (DEPRECATED — use /api/sengoku)
 * Story: MUSUBI Phase 7.3, PR-4g.1 Deprecation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { SUNSET_DATE, deprecationHeaders } from '@/lib/v1-deprecation';

const SUCCESSOR = '/api/sengoku/campaigns';
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

    const { campaignId } = body as { campaignId?: string };

    // Validate required: campaignId
    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: campaignId (string)' },
        { status: 400, headers: headers() }
      );
    }

    if (campaignId.length > 128) {
      return NextResponse.json(
        { error: 'campaignId exceeds maximum length (128)' },
        { status: 413, headers: headers() }
      );
    }

    // Sengoku v1 — DEPRECATED: use /api/sengoku
    return NextResponse.json(
      {
        success: true,
        deprecated: true,
        sunset: SUNSET_DATE,
        migration: `POST ${SUCCESSOR}`,
        data: {
          campaignId,
          status: 'ready',
          message: `DEPRECATED — migrate to ${SUCCESSOR} before 2026-06-30`,
        },
      },
      { status: 200, headers: headers() }
    );
  } catch (error) {
    console.error('v1 Sengoku API error:', error);
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
