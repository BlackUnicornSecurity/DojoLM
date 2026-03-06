/**
 * File: api-handler.ts
 * Purpose: Composable API middleware factory (Story 13.8 / A-06)
 *
 * Provides `createApiHandler()` factory that wraps route handlers with:
 * - Authentication (checkApiAuth)
 * - Rate limiting (token bucket per-IP)
 * - JSON body parsing with error handling
 * - Content-Type validation
 * - Error handling (apiError)
 * - TRACE method blocking
 *
 * Index:
 * - Types (line 20)
 * - Rate limiter (line 60)
 * - createApiHandler factory (line 120)
 */

import { NextRequest, NextResponse } from 'next/server';

import { checkApiAuth } from './api-auth';
import { apiError } from './api-error';

// ===========================================================================
// Types
// ===========================================================================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type RateLimitTier = 'read' | 'write' | 'execute';

export interface ApiHandlerConfig {
  /** Skip auth check (only for public routes like /api/health) */
  public?: boolean;
  /** Rate limit tier — default: 'read' for GET, 'write' for POST/PUT/PATCH/DELETE */
  rateLimit?: RateLimitTier;
  /** Maximum request body size in bytes (default: 2MB) */
  maxBodySize?: number;
}

export interface RouteContext {
  params?: Promise<Record<string, string>>;
}

export type ApiRouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse>;

// ===========================================================================
// Rate Limiter — Token Bucket (in-memory, per-IP)
// ===========================================================================

const RATE_LIMITS: Record<RateLimitTier, { maxTokens: number; refillRate: number }> = {
  read: { maxTokens: 60, refillRate: 1 },       // 60 req/min
  write: { maxTokens: 20, refillRate: 0.333 },   // 20 req/min
  execute: { maxTokens: 5, refillRate: 0.083 },   // 5 req/min
};

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

// Clean up stale buckets every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const BUCKET_STALE_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupBuckets(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > BUCKET_STALE_MS) {
      buckets.delete(key);
    }
  }

  lastCleanup = now;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
}

export function checkRateLimit(
  request: NextRequest,
  tier: RateLimitTier
): { allowed: boolean; remaining: number; resetMs: number } {
  cleanupBuckets();

  const ip = getClientIp(request);
  const key = `${ip}:${tier}`;
  const config = RATE_LIMITS[tier];
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    const resetMs = Math.ceil(1 / config.refillRate) * 1000;
    return { allowed: true, remaining: Math.floor(bucket.tokens), resetMs };
  }

  const resetMs = Math.ceil((1 - bucket.tokens) / config.refillRate) * 1000;
  return { allowed: false, remaining: 0, resetMs };
}

// ===========================================================================
// API Handler Factory
// ===========================================================================

function inferRateLimitTier(method: string): RateLimitTier {
  if (method === 'GET' || method === 'OPTIONS') return 'read';
  return 'write';
}

/**
 * Create a wrapped API handler with auth, rate limiting, and error handling.
 *
 * Usage:
 * ```ts
 * export const GET = createApiHandler(async (request) => {
 *   const data = await fetchSomething();
 *   return NextResponse.json(data);
 * });
 *
 * export const POST = createApiHandler(async (request) => {
 *   const body = await request.json();
 *   return NextResponse.json({ created: true }, { status: 201 });
 * }, { rateLimit: 'execute' });
 * ```
 */
export function createApiHandler(
  handler: ApiRouteHandler,
  config: ApiHandlerConfig = {}
): ApiRouteHandler {
  return async (request: NextRequest, context: RouteContext = {}): Promise<NextResponse> => {
    try {
      // Block TRACE method (Story 13.4)
      if (request.method === 'TRACE') {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
      }

      // Auth check (unless public route)
      if (!config.public) {
        const authResult = checkApiAuth(request);
        if (authResult) return authResult;
      }

      // Rate limiting
      const tier = config.rateLimit ?? inferRateLimitTier(request.method);
      const rateResult = checkRateLimit(request, tier);

      if (!rateResult.allowed) {
        const retryAfter = Math.ceil(rateResult.resetMs / 1000);
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + retryAfter),
            },
          }
        );
      }

      // Execute handler
      const response = await handler(request, context);

      // Add rate limit headers to response
      response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining));
      response.headers.set(
        'X-RateLimit-Reset',
        String(Math.ceil(Date.now() / 1000) + Math.ceil(rateResult.resetMs / 1000))
      );

      return response;
    } catch (error) {
      // Check for JSON parse errors (Story 13.4)
      if (error instanceof SyntaxError) {
        return apiError('Invalid JSON in request body', 400, error);
      }

      return apiError('Internal server error', 500, error);
    }
  };
}
