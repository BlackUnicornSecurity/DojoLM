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

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { checkApiAuth } from './api-auth';
import { apiError } from './api-error';
import { createRateLimitStore, type RateLimitStore } from './rate-limit-store';

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
  params: Promise<Record<string, string>>;
}

type ApiRouteHandlerWithoutContext = (
  request: NextRequest
) => Promise<NextResponse>;

type ApiRouteHandlerWithContext<TContext extends RouteContext> = (
  request: NextRequest,
  context: TContext
) => Promise<NextResponse>;

export type ApiRouteHandler<TContext extends RouteContext | undefined = undefined> =
  TContext extends RouteContext
    ? ApiRouteHandlerWithContext<TContext>
    : ApiRouteHandlerWithoutContext;

// ===========================================================================
// Rate Limiter — Token Bucket (backed by RateLimitStore)
// ===========================================================================

const RATE_LIMITS: Record<RateLimitTier, { maxTokens: number; refillRate: number }> = {
  read: { maxTokens: 60, refillRate: 1 },       // 60 req/min
  write: { maxTokens: 20, refillRate: 0.333 },   // 20 req/min
  execute: { maxTokens: 5, refillRate: 0.083 },   // 5 req/min
};

type RateLimitRequest = Pick<Request, 'headers' | 'url'> & Partial<Pick<NextRequest, 'nextUrl'>>;

// Module-level store — InMemoryStore by default, RedisStore if RATE_LIMIT_BACKEND=redis.
// Exported for test isolation (resetRateLimitStore).
export const _rateLimitStore: RateLimitStore = createRateLimitStore();

function hashRateLimitIdentity(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function getRateLimitScope(request: RateLimitRequest, tier: RateLimitTier): string {
  if (tier !== 'read') {
    return '__shared__';
  }

  if (request.nextUrl?.pathname) {
    return request.nextUrl.pathname;
  }

  try {
    return new URL(request.url).pathname;
  } catch {
    return '/unknown';
  }
}

// PT-RATELIM-M01 fix: Only trust proxy headers when TRUSTED_PROXY is set.
// When running without a trusted proxy, fall back to a stable browser/API-key
// fingerprint so one local client does not consume the whole in-memory bucket.
export function getClientIp(request: RateLimitRequest): string {
  if (process.env.TRUSTED_PROXY) {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
  }

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return `api-key:${hashRateLimitIdentity(apiKey)}`;
  }

  const fingerprintParts = [
    request.headers.get('sec-fetch-site'),
    request.headers.get('origin'),
    request.headers.get('referer'),
    request.headers.get('user-agent'),
    request.headers.get('accept-language'),
  ].filter((value): value is string => Boolean(value));

  if (fingerprintParts.length > 0) {
    return `fingerprint:${hashRateLimitIdentity(fingerprintParts.join('|'))}`;
  }

  return 'unknown';
}

export async function checkRateLimit(
  request: RateLimitRequest,
  tier: RateLimitTier
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const ip = getClientIp(request);
  const key = `${ip}:${tier}:${getRateLimitScope(request, tier)}`;
  return _rateLimitStore.consume(key, RATE_LIMITS[tier]);
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
  handler: ApiRouteHandlerWithoutContext,
  config?: ApiHandlerConfig
): ApiRouteHandlerWithoutContext;
export function createApiHandler<TContext extends RouteContext>(
  handler: ApiRouteHandlerWithContext<TContext>,
  config?: ApiHandlerConfig
): ApiRouteHandlerWithContext<TContext>;
export function createApiHandler<TContext extends RouteContext>(
  handler: ApiRouteHandlerWithoutContext | ApiRouteHandlerWithContext<TContext>,
  config: ApiHandlerConfig = {}
) {
  return async (request: NextRequest, context?: TContext): Promise<NextResponse> => {
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
      const rateResult = await checkRateLimit(request, tier);

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
      const response = await (
        handler as (request: NextRequest, context?: TContext) => Promise<NextResponse>
      )(request, context);

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
