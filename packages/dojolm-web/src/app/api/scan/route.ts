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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, engines }: { text: string; engines?: string[] } = body;

    // Input validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: text must be a non-empty string' },
        { status: 400 }
      );
    }

    // Size limit validation (100KB max)
    const MAX_SIZE = 100_000;
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

    // Run scanner with optional engine filter
    // Only pass engines if non-empty - empty array should scan all engines
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
    // Error handling
    console.error('Scan API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
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
