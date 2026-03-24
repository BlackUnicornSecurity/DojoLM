/**
 * File: api-handler.test.ts
 * Purpose: Tests for API handler factory with auth, rate limiting, and error handling
 * Coverage: AH-001 to AH-014
 * Source: src/lib/api-handler.ts
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../api-auth', () => ({
  checkApiAuth: vi.fn(() => null), // default: auth passes
}));

vi.mock('../api-error', () => ({
  apiError: vi.fn((message: string, status: number) =>
    NextResponse.json({ error: message }, { status })
  ),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are declared)
// ---------------------------------------------------------------------------

import { createApiHandler, checkRateLimit } from '../api-handler';
import { checkApiAuth } from '../api-auth';
import { apiError } from '../api-error';

// PT-RATELIM-M01: Tests use x-forwarded-for to set IPs, so TRUSTED_PROXY must be set
const ORIGINAL_TRUSTED_PROXY = process.env.TRUSTED_PROXY;
process.env.TRUSTED_PROXY = 'true';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  method = 'GET',
  ip = '10.0.0.1',
  url = 'http://localhost/api/test',
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'x-forwarded-for': ip },
  });
}

/**
 * Exhaust all tokens for a given IP + tier so subsequent calls are rate-limited.
 */
function exhaustBucket(ip: string, tier: 'read' | 'write' | 'execute', count: number): void {
  for (let i = 0; i < count; i++) {
    checkRateLimit(makeRequest('GET', ip), tier);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createApiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AH-001: Block TRACE method with 405
  // NextRequest rejects TRACE at construction, so we create a GET request
  // and override the method property to simulate a TRACE reaching the handler.
  it('AH-001: blocks TRACE method with 405', async () => {
    const handler = createApiHandler(async () => NextResponse.json({ ok: true }));
    const req = makeRequest('GET');
    Object.defineProperty(req, 'method', { value: 'TRACE', writable: false });
    const res = await handler(req, {});

    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toBe('Method not allowed');
  });

  // AH-002: Checks auth for non-public routes
  it('AH-002: checks auth for non-public routes', async () => {
    const handler = createApiHandler(async () => NextResponse.json({ ok: true }));
    const req = makeRequest('GET');
    await handler(req, {});

    expect(checkApiAuth).toHaveBeenCalledWith(req);
  });

  // AH-003: Skips auth for public routes
  it('AH-003: skips auth for public routes (config.public=true)', async () => {
    const handler = createApiHandler(
      async () => NextResponse.json({ ok: true }),
      { public: true },
    );
    await handler(makeRequest('GET'), {});

    expect(checkApiAuth).not.toHaveBeenCalled();
  });

  // AH-004: Returns 401 when auth fails
  it('AH-004: returns 401 when auth fails', async () => {
    const authResponse = NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    vi.mocked(checkApiAuth).mockReturnValueOnce(authResponse);

    const handler = createApiHandler(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeRequest('GET'), {});

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required');
  });

  // AH-005: Adds rate limit headers to successful responses
  it('AH-005: adds rate limit headers to successful responses', async () => {
    const handler = createApiHandler(
      async () => NextResponse.json({ ok: true }),
      { public: true },
    );
    const res = await handler(makeRequest('GET', '5.5.5.5'), {});

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    // Remaining should be a number string
    const remaining = Number(res.headers.get('X-RateLimit-Remaining'));
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  // AH-006: Returns 429 with Retry-After when rate limited
  it('AH-006: returns 429 with Retry-After when rate limited', async () => {
    const ip = '100.100.100.1';
    // Exhaust read bucket (60 tokens)
    exhaustBucket(ip, 'read', 60);

    const handler = createApiHandler(
      async () => NextResponse.json({ ok: true }),
      { public: true },
    );
    const res = await handler(makeRequest('GET', ip), {});

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
    expect(res.headers.get('Retry-After')).toBeDefined();
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  // AH-007: Catches JSON SyntaxError and returns 400
  it('AH-007: catches JSON SyntaxError and returns 400', async () => {
    const handler = createApiHandler(
      async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
      { public: true },
    );
    const res = await handler(makeRequest('POST', '7.7.7.7'), {});

    expect(res.status).toBe(400);
    expect(apiError).toHaveBeenCalledWith(
      'Invalid JSON in request body',
      400,
      expect.any(SyntaxError),
    );
  });

  // AH-008: Catches generic errors and returns 500
  it('AH-008: catches generic errors and returns 500', async () => {
    const handler = createApiHandler(
      async () => {
        throw new Error('Something went wrong');
      },
      { public: true },
    );
    const res = await handler(makeRequest('GET', '8.8.8.8'), {});

    expect(res.status).toBe(500);
    expect(apiError).toHaveBeenCalledWith(
      'Internal server error',
      500,
      expect.any(Error),
    );
  });

  // AH-012: Infers 'read' tier for GET, 'write' tier for POST
  it('AH-012: infers read tier for GET and write tier for POST', async () => {
    // This test verifies the handler does not 429 at different rates for GET vs POST.
    // GET uses 'read' (60/min), POST uses 'write' (20/min).
    // Exhaust 20 requests from a unique IP for write tier.
    const ip = '12.12.12.12';
    const postHandler = createApiHandler(
      async () => NextResponse.json({ ok: true }),
      { public: true },
    );

    // Exhaust 20 POST requests (write bucket)
    for (let i = 0; i < 20; i++) {
      await postHandler(makeRequest('POST', ip), {});
    }

    // 21st POST should be rate limited
    const postRes = await postHandler(makeRequest('POST', ip), {});
    expect(postRes.status).toBe(429);

    // But GET from same IP should still work (separate read bucket)
    const getHandler = createApiHandler(
      async () => NextResponse.json({ ok: true }),
      { public: true },
    );
    const getRes = await getHandler(makeRequest('GET', ip), {});
    expect(getRes.status).toBe(200);
  });

  // AH-013: Uses custom rateLimit tier from config
  it('AH-013: uses custom rateLimit tier from config', async () => {
    const ip = '13.13.13.13';
    const handler = createApiHandler(
      async () => NextResponse.json({ ok: true }),
      { public: true, rateLimit: 'execute' },
    );

    // Execute tier has 5 tokens; exhaust them
    for (let i = 0; i < 5; i++) {
      const res = await handler(makeRequest('GET', ip), {});
      expect(res.status).toBe(200);
    }

    // 6th request should be rate limited
    const res = await handler(makeRequest('GET', ip), {});
    expect(res.status).toBe(429);
  });
});

afterAll(() => {
  if (ORIGINAL_TRUSTED_PROXY === undefined) {
    delete process.env.TRUSTED_PROXY;
    return;
  }

  process.env.TRUSTED_PROXY = ORIGINAL_TRUSTED_PROXY;
});

describe('checkRateLimit', () => {
  // AH-009: Allows requests under the limit
  it('AH-009: allows requests under the limit', () => {
    const result = checkRateLimit(makeRequest('GET', '9.9.9.9'), 'read');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.resetMs).toBeGreaterThan(0);
  });

  // AH-010: Blocks requests over the limit
  it('AH-010: blocks requests over the limit (exhaust bucket)', () => {
    const ip = '10.10.10.10';
    // Exhaust execute bucket (5 tokens)
    exhaustBucket(ip, 'execute', 5);

    const result = checkRateLimit(makeRequest('GET', ip), 'execute');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetMs).toBeGreaterThan(0);
  });

  // AH-011: Refills tokens over time
  it('AH-011: refills tokens over time', () => {
    const ip = '11.11.11.11';
    // Exhaust read bucket
    exhaustBucket(ip, 'read', 60);

    // Verify blocked
    const blocked = checkRateLimit(makeRequest('GET', ip), 'read');
    expect(blocked.allowed).toBe(false);

    // Simulate time passing by manipulating Date.now
    const originalDateNow = Date.now;
    const futureTime = originalDateNow() + 120_000; // 2 minutes later
    Date.now = vi.fn(() => futureTime);

    try {
      const refilled = checkRateLimit(makeRequest('GET', ip), 'read');
      expect(refilled.allowed).toBe(true);
      expect(refilled.remaining).toBeGreaterThan(0);
    } finally {
      Date.now = originalDateNow;
    }
  });

  // AH-014: Uses separate buckets per IP
  it('AH-014: uses separate buckets per IP', () => {
    const ipA = '14.14.14.1';
    const ipB = '14.14.14.2';

    // Exhaust bucket for IP A
    exhaustBucket(ipA, 'execute', 5);

    // IP A should be blocked
    const resultA = checkRateLimit(makeRequest('GET', ipA), 'execute');
    expect(resultA.allowed).toBe(false);

    // IP B should still be allowed
    const resultB = checkRateLimit(makeRequest('GET', ipB), 'execute');
    expect(resultB.allowed).toBe(true);
  });

  it('AH-015: falls back to request fingerprint when TRUSTED_PROXY is unset', () => {
    process.env.TRUSTED_PROXY = '';

    try {
      const browserA = new NextRequest('http://localhost/api/test', {
        headers: {
          'user-agent': 'playwright-a',
          origin: 'http://localhost:42001',
          'sec-fetch-site': 'same-origin',
        },
      });
      const browserB = new NextRequest('http://localhost/api/test', {
        headers: {
          'user-agent': 'playwright-b',
          origin: 'http://localhost:42001',
          'sec-fetch-site': 'same-origin',
        },
      });

      for (let i = 0; i < 5; i++) {
        checkRateLimit(browserA, 'execute');
      }

      const blocked = checkRateLimit(browserA, 'execute');
      expect(blocked.allowed).toBe(false);

      const allowed = checkRateLimit(browserB, 'execute');
      expect(allowed.allowed).toBe(true);
    } finally {
      process.env.TRUSTED_PROXY = ORIGINAL_TRUSTED_PROXY ?? 'true';
    }
  });

  it('AH-016: isolates read buckets by route path', () => {
    const ip = '15.15.15.15';
    const fixturesRequest = makeRequest('GET', ip, 'http://localhost/api/fixtures');
    const complianceRequest = makeRequest('GET', ip, 'http://localhost/api/compliance');

    for (let i = 0; i < 60; i++) {
      const result = checkRateLimit(fixturesRequest, 'read');
      expect(result.allowed).toBe(true);
    }

    const blockedFixtures = checkRateLimit(fixturesRequest, 'read');
    expect(blockedFixtures.allowed).toBe(false);

    const separateRoute = checkRateLimit(complianceRequest, 'read');
    expect(separateRoute.allowed).toBe(true);
  });
});
