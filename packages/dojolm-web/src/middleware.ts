/**
 * File: middleware.ts
 * Purpose: Next.js middleware for API auth + rate limiting (Story 13.1 / Story 8.3)
 *
 * Provides Node.js-runtime auth checking for all /api/* routes.
 * Public routes (health) are whitelisted.
 * Admin routes require elevated auth (future: role-based).
 * Auth failures are recorded via the security audit logger (Story 13.6).
 *
 * Story 8.3 Security Hardening:
 * - Multi-header Sec-Fetch validation (R2-C1)
 * - Sliding window rate limiter (R2-S3)
 * - Environment-dependent CORS origins
 *
 * Index:
 * - Runtime config (line ~25)
 * - Public route whitelist (line ~28)
 * - Client IP extraction (line ~35)
 * - Auth check (line ~50)
 * - Rate limiter (line ~75)
 * - Middleware function (line ~140)
 * - Config matcher (end of file)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { auditLog } from '@/lib/audit-logger';

// Use Node.js runtime so we can access fs-based audit logging
export const runtime = 'nodejs';

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  '/api/admin/health',
  '/api/health',
]);

// Routes that require elevated (admin) permissions — future RBAC
const ADMIN_ROUTES_PREFIX = '/api/admin';

/**
 * Extract client IP from request headers.
 * Checks common proxy headers, falls back to 'unknown'.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs; take the first
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// ===========================================================================
// In-Memory Sliding Window Rate Limiter (R2-S3)
// ===========================================================================

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_GENERAL = 100; // 100 req/min per IP (external/programmatic)
const RATE_LIMIT_SAME_ORIGIN = 300; // 300 req/min per IP (same-origin UI — R3-001)
const RATE_LIMIT_AUTH_FAILURE = 10; // 10 auth failures/min per IP
const RATE_LIMIT_MAP_CAP = 10_000; // LRU eviction cap (R2-S3)

interface RateLimitEntry {
  timestamps: number[];
  authFailures: number[];
  lastAccess: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60s
let lastCleanup = Date.now();
function cleanupRateLimiter() {
  const now = Date.now();
  if (now - lastCleanup < RATE_LIMIT_WINDOW_MS) return;
  lastCleanup = now;
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, entry] of rateLimitMap) {
    if (entry.lastAccess < cutoff) {
      rateLimitMap.delete(key);
    }
  }
  // LRU eviction if map exceeds cap
  if (rateLimitMap.size > RATE_LIMIT_MAP_CAP) {
    const entries = Array.from(rateLimitMap.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    const toRemove = entries.slice(0, rateLimitMap.size - RATE_LIMIT_MAP_CAP);
    for (const [key] of toRemove) {
      rateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(ip: string, limit: number = RATE_LIMIT_GENERAL): { limited: boolean; remaining: number; retryAfter?: number } {
  cleanupRateLimiter();
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  let entry = rateLimitMap.get(ip);
  if (!entry) {
    entry = { timestamps: [], authFailures: [], lastAccess: now };
    rateLimitMap.set(ip, entry);
  }

  entry.lastAccess = now;
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);
  entry.authFailures = entry.authFailures.filter(t => t > cutoff);

  if (entry.timestamps.length >= limit) {
    return { limited: true, remaining: 0, retryAfter: 60 };
  }
  if (entry.authFailures.length >= RATE_LIMIT_AUTH_FAILURE) {
    return { limited: true, remaining: 0, retryAfter: 60 };
  }

  // Push timestamp AFTER both checks pass — only count non-limited requests
  entry.timestamps.push(now);
  return { limited: false, remaining: limit - entry.timestamps.length };
}

function recordAuthFailure(ip: string) {
  let entry = rateLimitMap.get(ip);
  if (!entry) {
    entry = { timestamps: [], authFailures: [], lastAccess: Date.now() };
    rateLimitMap.set(ip, entry);
  }
  entry.authFailures.push(Date.now());
}

/** Reset rate limiter state — exported for test isolation */
export function resetRateLimiter() {
  rateLimitMap.clear();
}

/**
 * Timing-safe API key comparison.
 * Returns true if authenticated, false otherwise.
 */
function isAuthenticated(request: NextRequest): boolean {
  const apiKey = process.env.NODA_API_KEY;

  // If no API key configured, fail closed in production
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[middleware] NODA_API_KEY is not set in production — all API requests blocked');
      return false;
    }
    return true; // dev-only bypass
  }

  const providedKey = request.headers.get('x-api-key') ?? '';

  // HMAC-based timing-safe comparison (C10 fix: eliminates length-based oracle)
  const expected = Buffer.from(apiKey, 'utf-8');
  const provided = Buffer.from(providedKey, 'utf-8');
  const expectedHash = crypto.createHmac('sha256', 'noda-key-compare').update(expected).digest();
  const providedHash = crypto.createHmac('sha256', 'noda-key-compare').update(provided).digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Block TRACE method (Story 13.4 / BUG-032)
  // Note: Next.js may intercept TRACE before middleware runs, returning 500.
  // This guard catches cases where the request does reach middleware.
  if (request.method === 'TRACE') {
    return new NextResponse(null, {
      status: 405,
      headers: { 'Allow': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
    });
  }

  // R3-001: Determine if this is a verified same-origin browser request.
  // Same-origin UI requests (dashboard widgets) are exempt from rate limiting
  // because a single page load triggers ~15+ concurrent API calls.
  // External/programmatic requests are still rate-limited.
  const secFetchSite = request.headers.get('sec-fetch-site');
  const isSameOrigin = secFetchSite === 'same-origin';

  // Rate limiting (R2-S3) — only for non-same-origin requests
  const ip = getClientIp(request);
  const rateCheck = isSameOrigin
    ? checkRateLimit(ip, RATE_LIMIT_SAME_ORIGIN)
    : checkRateLimit(ip, RATE_LIMIT_GENERAL);
  if (rateCheck.limited) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateCheck.retryAfter ?? 60),
        'X-RateLimit-Limit': String(isSameOrigin ? RATE_LIMIT_SAME_ORIGIN : RATE_LIMIT_GENERAL),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((Date.now() + RATE_LIMIT_WINDOW_MS) / 1000)),
      },
    });
  }

  // R3-006: Attach X-RateLimit-* headers to all API responses
  const effectiveLimit = isSameOrigin ? RATE_LIMIT_SAME_ORIGIN : RATE_LIMIT_GENERAL;
  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(effectiveLimit),
    'X-RateLimit-Remaining': String(rateCheck.remaining),
    'X-RateLimit-Reset': String(Math.ceil((Date.now() + RATE_LIMIT_WINDOW_MS) / 1000)),
  };

  // Allow CORS preflight requests without auth (BUG-034)
  // Origin validation: only reflect known origins, deny unknown in production
  if (request.method === 'OPTIONS') {
    const requestOrigin = request.headers.get('origin') ?? '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? new Set([appUrl])
      : new Set([appUrl, 'http://localhost:3000', 'http://localhost:3001']);
    const corsOrigin = allowedOrigins.has(requestOrigin) ? requestOrigin : appUrl;

    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Content-Type validation for mutation methods (Story 13.4)
  const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH']);
  if (MUTATION_METHODS.has(request.method)) {
    const contentType = request.headers.get('content-type') ?? '';
    // Allow application/json and multipart/form-data (file uploads)
    const isJson = contentType.includes('application/json');
    const isMultipart = contentType.includes('multipart/form-data');
    if (!isJson && !isMultipart) {
      return NextResponse.json(
        { error: 'Unsupported Media Type. Content-Type must be application/json' },
        { status: 415 }
      );
    }
  }

  // Allow public routes (with rate limit headers — R3-006)
  if (PUBLIC_ROUTES.has(pathname)) {
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(rateLimitHeaders)) response.headers.set(k, v);
    return response;
  }

  // F-05: Allow same-origin browser requests without API key.
  // Multi-header validation (R2-C1): Sec-Fetch-Site alone is insufficient.
  // Require Sec-Fetch-Site: same-origin AND valid Mode AND valid Dest.
  // SEC-005 hardening: Also require Origin or Referer match — prevents curl-only Sec-Fetch spoofing.
  const secFetchMode = request.headers.get('sec-fetch-mode');
  const secFetchDest = request.headers.get('sec-fetch-dest');

  const VALID_SEC_FETCH_MODES = new Set(['cors', 'same-origin', 'navigate']);
  const VALID_SEC_FETCH_DESTS = new Set(['empty', 'document']);

  if (
    isSameOrigin &&
    secFetchMode && VALID_SEC_FETCH_MODES.has(secFetchMode) &&
    secFetchDest && VALID_SEC_FETCH_DESTS.has(secFetchDest)
  ) {
    const origin = request.headers.get('origin') ?? '';
    const host = request.headers.get('host') ?? '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // SEC-005: Require Origin OR Referer to actually match the app — Sec-Fetch alone is not enough
    const originMatch = origin === appUrl || origin === `http://${host}` || origin === `https://${host}`;
    const referer = request.headers.get('referer') ?? '';
    const refererMatch = referer.startsWith(appUrl) || referer.startsWith(`http://${host}`) || referer.startsWith(`https://${host}`);

    if (originMatch || (!origin && refererMatch)) {
      const response = NextResponse.next();
      for (const [k, v] of Object.entries(rateLimitHeaders)) response.headers.set(k, v);
      return response;
    }
    // If Sec-Fetch headers present but neither Origin nor Referer match, fall through to API key auth
  }

  // Auth check (for external/programmatic API access)
  if (!isAuthenticated(request)) {
    recordAuthFailure(ip);

    // Fire-and-forget: audit log should never block the response
    auditLog.authFailure({ endpoint: pathname, ip }).catch(() => {
      /* audit logging is best-effort */
    });

    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Admin route elevated check (future: check role)
  if (pathname.startsWith(ADMIN_ROUTES_PREFIX) && !PUBLIC_ROUTES.has(pathname)) {
    // For now, same API key grants admin access
    // Future: check for admin role claim
  }

  const response = NextResponse.next();
  for (const [k, v] of Object.entries(rateLimitHeaders)) response.headers.set(k, v);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
