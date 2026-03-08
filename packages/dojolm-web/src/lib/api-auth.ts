/**
 * File: api-auth.ts
 * Purpose: Temporary per-route API authentication guard (C-02/BUG-018 P0)
 *
 * Provides a lightweight auth check for API routes until Epic 13
 * implements full middleware-based authentication (Story 13.1).
 *
 * Auth mechanism: X-API-Key header checked against NODA_API_KEY env var.
 * If NODA_API_KEY is not set, auth is bypassed (development mode).
 */

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Check API authentication via X-API-Key header.
 * Returns null if authenticated, or a 401 NextResponse if not.
 *
 * If NODA_API_KEY env var is not set, auth is bypassed to avoid
 * breaking development workflows. A console warning is emitted in production.
 */
export function checkApiAuth(request: NextRequest): NextResponse | null {
  // F-05: Allow same-origin browser requests without API key.
  // Sec-Fetch-Site is a browser "forbidden header" (cannot be set by JS fetch).
  // Combined with Origin/Referer check to prevent non-browser spoofing.
  // Note: Browsers do NOT send Origin on GET requests, so Referer is used as fallback.
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin') {
    const origin = request.headers.get('origin') ?? '';
    const host = request.headers.get('host') ?? '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    if (origin === appUrl || origin === `http://${host}` || origin === `https://${host}`) {
      return null;
    }
    // Fallback: check Referer header (sent on GET requests where Origin is absent)
    if (!origin) {
      const referer = request.headers.get('referer') ?? '';
      if (referer.startsWith(appUrl) || referer.startsWith(`http://${host}`) || referer.startsWith(`https://${host}`)) {
        return null;
      }
    }
  }

  // Read per-request to pick up runtime changes (not frozen at module load)
  const apiKey = process.env.NODA_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 503 });
    }
    return null; // dev-only bypass
  }

  const providedKey = request.headers.get('x-api-key') ?? '';

  // HMAC-based timing-safe comparison (C10 fix: eliminates length-based oracle)
  const expected = Buffer.from(apiKey, 'utf-8');
  const provided = Buffer.from(providedKey, 'utf-8');
  const expectedHash = crypto.createHmac('sha256', 'noda-key-compare').update(expected).digest();
  const providedHash = crypto.createHmac('sha256', 'noda-key-compare').update(provided).digest();

  if (!crypto.timingSafeEqual(expectedHash, providedHash)) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return null;
}
