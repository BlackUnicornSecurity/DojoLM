/**
 * File: route.ts
 * Purpose: Public v1 API route for Sengoku campaigns (DEPRECATED — use /api/sengoku)
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
    'Link': '</api/sengoku/campaigns>; rel="successor-version"',
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

    const { campaignId } = body as { campaignId?: string };

    // Validate required: campaignId
    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: campaignId (string)' },
        { status: 400 }
      );
    }

    if (campaignId.length > 128) {
      return NextResponse.json(
        { error: 'campaignId exceeds maximum length (128)' },
        { status: 413 }
      );
    }

    // Sengoku v1 — DEPRECATED: use /api/sengoku
    return NextResponse.json(
      {
        success: true,
        deprecated: true,
        sunset: SUNSET_DATE,
        migration: 'POST /api/sengoku/campaigns',
        data: {
          campaignId,
          status: 'ready',
          message: 'DEPRECATED — migrate to /api/sengoku/campaigns before 2026-06-30',
        },
      },
      { status: 200, headers: deprecationHeaders() }
    );
  } catch (error) {
    console.error('v1 Sengoku API error:', error);
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
