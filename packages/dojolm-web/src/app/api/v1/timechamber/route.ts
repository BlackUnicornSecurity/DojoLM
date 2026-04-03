/**
 * File: route.ts
 * Purpose: Public v1 API route for TimeChamber
 * Story: MUSUBI Phase 7.3
 *
 * Index:
 * - POST handler for v1 timechamber requests (line 10)
 * - Input validation (line 20)
 * - Error handling (line 48)
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

    const { planId, modelId } = body as { planId?: string; modelId?: string };

    // Validate required: planId
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: planId (string)' },
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

    // Stub response — actual TimeChamber wiring comes in follow-up
    return NextResponse.json({
      success: true,
      message: 'TimeChamber v1 endpoint ready',
      data: null,
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
    });
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
