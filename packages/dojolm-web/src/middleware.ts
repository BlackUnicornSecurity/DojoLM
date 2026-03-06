/**
 * File: middleware.ts
 * Purpose: Next.js middleware for API auth + rate limiting (Story 13.1)
 *
 * Provides Node.js-runtime auth checking for all /api/* routes.
 * Public routes (health) are whitelisted.
 * Admin routes require elevated auth (future: role-based).
 * Auth failures are recorded via the security audit logger (Story 13.6).
 *
 * Index:
 * - Runtime config (line 19)
 * - Public route whitelist (line 22)
 * - Client IP extraction (line 29)
 * - Auth check (line 44)
 * - Middleware function (line 64)
 * - Content-Type validation (line 84)
 * - Config matcher (line 120)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { auditLog } from '@/lib/audit-logger';

// Use Node.js runtime so we can access fs-based audit logging
export const runtime = 'nodejs';

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  '/api/admin/health',
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

  // Block TRACE method (Story 13.4)
  if (request.method === 'TRACE') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
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

  // Allow public routes
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Auth check
  if (!isAuthenticated(request)) {
    const ip = getClientIp(request);

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

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
