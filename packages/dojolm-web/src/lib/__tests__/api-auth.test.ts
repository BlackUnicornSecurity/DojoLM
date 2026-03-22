/**
 * File: api-auth.test.ts
 * Purpose: Tests for per-route API authentication guard
 * Coverage: AUTH-001 to AUTH-006
 * Source: src/lib/api-auth.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('checkApiAuth', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  function createReq(apiKey?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (apiKey) headers['x-api-key'] = apiKey;
    return new NextRequest('http://localhost:42001/api/test', { headers });
  }

  // AUTH-001: Returns null (pass) when key matches
  it('AUTH-001: returns null when key matches', async () => {
    process.env.NODA_API_KEY = 'valid-key-123';
    const { checkApiAuth } = await import('../api-auth');

    const result = checkApiAuth(createReq('valid-key-123'));
    expect(result).toBeNull();
  });

  // AUTH-002: Returns 401 when key does not match
  it('AUTH-002: returns 401 when key is invalid', async () => {
    process.env.NODA_API_KEY = 'valid-key-123';
    const { checkApiAuth } = await import('../api-auth');

    const result = checkApiAuth(createReq('wrong-key'));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  // AUTH-003: Returns 401 when no key provided
  it('AUTH-003: returns 401 when no key provided', async () => {
    process.env.NODA_API_KEY = 'valid-key-123';
    const { checkApiAuth } = await import('../api-auth');

    const result = checkApiAuth(createReq());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  // AUTH-004: Bypasses auth in dev when NODA_API_KEY not set
  it('AUTH-004: bypasses auth in dev when NODA_API_KEY not set', async () => {
    delete process.env.NODA_API_KEY;
    process.env.NODE_ENV = 'development';
    const { checkApiAuth } = await import('../api-auth');

    const result = checkApiAuth(createReq());
    expect(result).toBeNull();
  });

  // AUTH-005: Returns 503 in production when NODA_API_KEY not set
  it('AUTH-005: returns 503 in production when NODA_API_KEY not set', async () => {
    delete process.env.NODA_API_KEY;
    process.env.NODE_ENV = 'production';
    const { checkApiAuth } = await import('../api-auth');

    const result = checkApiAuth(createReq());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(503);
  });

  // AUTH-006: Uses timing-safe comparison (no length oracle)
  it('AUTH-006: same-length and different-length keys both return 401', async () => {
    process.env.NODA_API_KEY = 'exact-len-key';
    const { checkApiAuth } = await import('../api-auth');

    // Same length, different content
    const r1 = checkApiAuth(createReq('wrong-len-key'));
    expect(r1!.status).toBe(401);

    // Different length
    const r2 = checkApiAuth(createReq('short'));
    expect(r2!.status).toBe(401);
  });
});
