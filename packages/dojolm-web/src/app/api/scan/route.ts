/**
 * File: route.ts
 * Purpose: Next.js API route for text scanning
 * Index:
 * - POST handler for scan requests (line 17)
 * - Input validation (line 21)
 * - Scanner integration (line 32)
 * - Error handling (line 42)
 */

import { NextRequest, NextResponse } from 'next/server';
import { scan } from '@dojolm/scanner';
import type { ScanOptions } from '@dojolm/scanner';
import { checkApiAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // BUG-035: Guard against null/non-object body (null is valid JSON)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const { text, engines } = body as { text: string; engines?: string[] };

    // Input validation (BUG-022: text must be a non-empty string, max 100KB)
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: text must be a non-empty string' },
        { status: 400 }
      );
    }

    // Size limit validation (F-06: lowered from 100K to 10K to prevent event loop blocking)
    const MAX_SIZE = 10_000;
    if (text.length > MAX_SIZE) {
      return NextResponse.json(
        { error: `Input too large: maximum ${MAX_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // Trim and validate non-empty after trimming
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: text cannot be empty or whitespace only' },
        { status: 400 }
      );
    }

    // Validate engines parameter if provided
    if (engines !== undefined && (!Array.isArray(engines) || engines.some(e => typeof e !== 'string'))) {
      return NextResponse.json({ error: 'Invalid engines: must be an array of strings' }, { status: 400 });
    }

    // Run scanner with optional engine filter
    // F-06/F-08: 10K char limit above is the primary DoS protection.
    // scan() is synchronous — cannot be interrupted by setTimeout on the same thread.
    const scanOptions: ScanOptions = (engines && engines.length > 0) ? { engines } : {};
    const result = scan(trimmedText, scanOptions);

    // Return scan result
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Scan API error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}
