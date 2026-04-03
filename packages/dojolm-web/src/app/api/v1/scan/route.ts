/**
 * File: route.ts
 * Purpose: Public v1 API route for text scanning (thin wrapper over @dojolm/scanner)
 * Story: MUSUBI Phase 7.3
 *
 * Index:
 * - POST handler for v1 scan requests (line 12)
 * - Input validation (line 22)
 * - Scanner integration (line 50)
 * - Error handling (line 60)
 */

import { NextRequest, NextResponse } from 'next/server';
import { scan } from '@dojolm/scanner';
import { withAuth } from '@/lib/auth/route-guard';

const MAX_TEXT_SIZE = 10_000;

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

    const { text } = body as { text?: string };

    // Validate required: text
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: text (string)' },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `Input too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // Strip null bytes
    if (/\x00/.test(text)) {
      return NextResponse.json(
        { error: 'Invalid input: null bytes are not allowed' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: text cannot be empty or whitespace only' },
        { status: 400 }
      );
    }

    // Run scanner
    const result = scan(trimmedText);

    return NextResponse.json({
      success: true,
      data: result,
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('v1 Scan API error:', error);
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
