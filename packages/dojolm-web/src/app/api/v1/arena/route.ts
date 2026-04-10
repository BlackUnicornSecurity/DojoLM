/**
 * File: route.ts
 * Purpose: Public v1 API route for Arena mode (DEPRECATED — use /api/arena)
 * Story: MUSUBI Phase 7.3, PR-4g.1 Deprecation
 *
 * Index:
 * - SUNSET_DATE constant (line 14)
 * - deprecationHeaders helper (line 16)
 * - POST handler for v1 arena requests (line 24)
 * - Input validation (line 34)
 * - Error handling (line 62)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

/** RFC 8594 Sunset date — after this date, endpoint may return 410 Gone */
const SUNSET_DATE = 'Sat, 30 Jun 2026 00:00:00 GMT';

function deprecationHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Sunset': SUNSET_DATE,
    'Deprecation': 'true',
    'Link': '</api/arena>; rel="successor-version"',
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

    const { mode, modelId } = body as { mode?: string; modelId?: string };

    // Validate required: mode
    if (!mode || typeof mode !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: mode (string)' },
        { status: 400 }
      );
    }

    const VALID_ARENA_MODES = ['kunai', 'shuriken', 'naginata', 'musashi'] as const;
    if (!VALID_ARENA_MODES.includes(mode as typeof VALID_ARENA_MODES[number])) {
      return NextResponse.json(
        { error: `Invalid mode. Valid: ${VALID_ARENA_MODES.join(', ')}` },
        { status: 400 }
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

    // Arena v1 — DEPRECATED: use /api/arena
    return NextResponse.json(
      {
        success: true,
        deprecated: true,
        sunset: SUNSET_DATE,
        migration: 'POST /api/arena',
        data: {
          mode,
          modelId,
          status: 'ready',
          message: 'DEPRECATED — migrate to POST /api/arena before 2026-06-30',
        },
      },
      { status: 200, headers: deprecationHeaders() }
    );
  } catch (error) {
    console.error('v1 Arena API error:', error);
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
