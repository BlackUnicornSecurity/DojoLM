/**
 * File: route.ts
 * Purpose: Next.js API route for orchestrator run status polling
 * Story: MUSUBI Phase 7.2
 *
 * Index:
 * - GET handler for status polling (line 11)
 * - Query param validation (line 18)
 * - Error handling (line 38)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    // Validate required: runId
    if (!runId || typeof runId !== 'string' || runId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required query parameter: runId' },
        { status: 400 }
      );
    }

    // Basic format validation — runId should be reasonable length
    if (runId.length > 128) {
      return NextResponse.json(
        { error: 'Invalid runId: too long (max 128 characters)' },
        { status: 400 }
      );
    }

    // Stub response — actual status lookup comes in follow-up
    return NextResponse.json({
      success: true,
      message: 'Orchestrator status endpoint ready',
      data: {
        runId,
        status: 'pending',
        progress: 0,
        startedAt: null,
        completedAt: null,
      },
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('Orchestrator status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { resource: 'executions', action: 'read', skipCsrf: true });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Allow': 'GET, OPTIONS', 'Content-Type': 'application/json' },
  });
}
