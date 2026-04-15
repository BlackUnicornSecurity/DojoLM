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
import { isPublicApiRoute, isPublicBrowserActionRoute } from '@/lib/api-route-access';
import { isTrustedBrowserOriginRequest, isTrustedBrowserSessionRequest } from '@/lib/request-origin';
import { isDemoMode } from '@/lib/demo';

// Per-process random HMAC key. Used only as a length-normalizer so timingSafeEqual
// can compare variable-length inputs of equal hash length; the key itself carries
// no secret, but randomizing per-process removes any offline HMAC pre-computation
// surface that a hardcoded constant would leave behind.
const API_KEY_HMAC_KEY = crypto.randomBytes(32);

/**
 * Check API authentication via X-API-Key header.
 * Returns null if authenticated, or a 401 NextResponse if not.
 *
 * If NODA_API_KEY env var is not set, auth is bypassed to avoid
 * breaking development workflows. A console warning is emitted in production.
 */
export function checkApiAuth(request: NextRequest): NextResponse | null {
  // Demo mode: bypass all API auth checks
  if (isDemoMode()) {
    return null;
  }

  // OPTIONS preflight requests must always be allowed through so route
  // handlers can respond with the correct 204 + Allow header (SEC-R3-001).
  if (request.method === 'OPTIONS') {
    return null;
  }

  if (isPublicApiRoute(request.nextUrl.pathname, request.method)) {
    return null;
  }

  // Allow specific public UI actions for verified same-origin browser traffic.
  if (isPublicBrowserActionRoute(request.nextUrl.pathname, request.method) && isTrustedBrowserOriginRequest(request)) {
    return null;
  }

  // Allow authenticated same-origin browser requests without an API key.
  // This path requires validated session state plus a configured app origin,
  // so header spoofing alone cannot satisfy the bypass.
  if (isTrustedBrowserSessionRequest(request)) {
    return null;
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
  const expectedHash = crypto.createHmac('sha256', API_KEY_HMAC_KEY).update(expected).digest();
  const providedHash = crypto.createHmac('sha256', API_KEY_HMAC_KEY).update(provided).digest();

  if (!crypto.timingSafeEqual(expectedHash, providedHash)) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return null;
}
