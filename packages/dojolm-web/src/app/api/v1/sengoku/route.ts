/**
 * File: route.ts
 * Purpose: Public v1 API route for Sengoku campaigns
 * Story: MUSUBI Phase 7.3
 *
 * Index:
 * - POST handler for v1 sengoku requests (line 10)
 * - Input validation (line 20)
 * - Error handling (line 42)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

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

    // Stub response — actual Sengoku wiring comes in follow-up
    return NextResponse.json({
      success: true,
      message: 'Sengoku v1 endpoint ready',
      data: null,
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
    });
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
