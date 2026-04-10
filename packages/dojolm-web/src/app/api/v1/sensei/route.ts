/**
 * File: route.ts
 * Purpose: Public v1 API route for Sensei capabilities (DEPRECATED — use /api/sensei)
 * Story: MUSUBI Phase 7.3, PR-4g.1 Deprecation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

const MAX_TEXT_SIZE = 10_000;
const SUNSET_DATE = 'Sat, 30 Jun 2026 00:00:00 GMT';

function deprecationHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Sunset': SUNSET_DATE,
    'Deprecation': 'true',
    'Link': '</api/sensei/chat>; rel="successor-version"',
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

    const { capability } = body as { capability?: string };

    // Validate required: capability
    if (!capability || typeof capability !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: capability (string)' },
        { status: 400 }
      );
    }

    if (capability.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `capability too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // Sensei v1 — pull available capabilities from bu-tpi
    try {
      const senseiMod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'bu-tpi/sensei' as string);
      const SENSEI_CAPABILITIES = senseiMod.SENSEI_CAPABILITIES;
      return NextResponse.json(
        {
          success: true,
          deprecated: true,
          sunset: SUNSET_DATE,
          migration: 'POST /api/sensei/{capability}',
          data: {
            capability,
            availableCapabilities: [...SENSEI_CAPABILITIES],
            status: 'ready',
            message: 'DEPRECATED — migrate to /api/sensei/{capability} before 2026-06-30',
          },
        },
        { status: 200, headers: deprecationHeaders() }
      );
    } catch {
      return NextResponse.json(
        { success: false, error: 'Sensei unavailable' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('v1 Sensei API error:', error);
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
