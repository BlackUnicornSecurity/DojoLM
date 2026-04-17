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
import { isDemoMode } from '@/lib/demo';
import { demoScanPost } from '@/lib/demo/mock-api-handlers';
import { scan } from '@dojolm/scanner';
import type { ScanOptions } from '@dojolm/scanner';
import { withAuth } from '@/lib/auth/route-guard';
import { emitScannerFindings } from '@/lib/ecosystem-emitters';
import { auditLog } from '@/lib/audit-logger';

export const POST = withAuth(async (request: NextRequest, context) => {
  const username = context?.user?.username ?? 'system';
  if (isDemoMode()) return await demoScanPost(request);
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

    // BUG-035: Guard against null/non-object body (null is valid JSON)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    // INT-BUG-001: Accept both "text" and "content" field names for backward compatibility
    const { text: textField, content: contentField, engines } = body as { text?: string; content?: string; engines?: string[] };
    const text = textField ?? contentField;

    // Input validation (BUG-022: text must be a non-empty string, max 100KB)
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: text (or content) must be a non-empty string' },
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

    // R4-005: Strip null bytes from input
    if (/\x00/.test(text)) {
      return NextResponse.json(
        { error: 'Invalid input: null bytes are not allowed' },
        { status: 400 }
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
    const scanStart = Date.now();
    const result = scan(trimmedText, scanOptions);
    const durationMs = Date.now() - scanStart;

    // Fire-and-forget: emit ecosystem findings for scanner results (Story 10.2)
    if (result.findings.length > 0) {
      emitScannerFindings(result.findings, trimmedText);
    }

    // Audit trail — fire-and-forget
    void auditLog.scanExecuted({
      endpoint: '/api/scan',
      user: username,
      scanType: (engines && engines.length > 0) ? engines.join(',') : 'all',
      findings: result.findings.length,
      durationMs,
    });

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
}, { resource: 'executions', action: 'execute' });

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
