/**
 * File: middleware.test.ts
 * Purpose: Tests for Next.js API middleware (auth, rate limiting, content-type)
 * Coverage: MW-001 to MW-012
 * Source: src/middleware.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';

// Mock audit-logger before importing middleware
vi.mock('@/lib/audit-logger', () => ({
  auditLog: {
    authFailure: vi.fn().mockResolvedValue(undefined),
    authSuccess: vi.fn().mockResolvedValue(undefined),
    rateLimitHit: vi.fn().mockResolvedValue(undefined),
    configChange: vi.fn().mockResolvedValue(undefined),
    guardModeChange: vi.fn().mockResolvedValue(undefined),
    exportAction: vi.fn().mockResolvedValue(undefined),
    validationFailure: vi.fn().mockResolvedValue(undefined),
  },
}));

// Helper to compute the expected HMAC for a key
function computeHmac(key: string): Buffer {
  return crypto.createHmac('sha256', 'noda-key-compare').update(Buffer.from(key, 'utf-8')).digest();
}

// Helper to create a NextRequest for API routes
function createApiRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: new Headers(options.headers ?? {}),
  };
  if (options.body && options.method !== 'GET') {
    init.body = options.body;
  }
  return new NextRequest(url, init);
}

describe('Middleware', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  // MW-001: Timing-safe API key comparison with valid key
  it('MW-001: allows requests with valid API key', async () => {
    process.env.NODA_API_KEY = 'test-valid-key-12345';
    process.env.NODE_ENV = 'production';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/scan', {
      method: 'POST',
      headers: {
        'x-api-key': 'test-valid-key-12345',
        'content-type': 'application/json',
      },
    });

    const res = await middleware(req);
    // NextResponse.next() has no status override (defaults to 200)
    expect(res.status).toBe(200);
  });

  // MW-002: Timing-safe comparison with invalid key
  it('MW-002: rejects requests with invalid API key', async () => {
    process.env.NODA_API_KEY = 'test-valid-key-12345';
    process.env.NODE_ENV = 'production';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/scan', {
      method: 'POST',
      headers: {
        'x-api-key': 'wrong-key',
        'content-type': 'application/json',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Authentication required');
  });

  // MW-003: Missing NODA_API_KEY in production mode blocks all requests
  it('MW-003: blocks all requests when NODA_API_KEY is not set in production', async () => {
    delete process.env.NODA_API_KEY;
    process.env.NODE_ENV = 'production';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await middleware(req);
    expect(res.status).toBe(401);
  });

  // MW-004: Missing NODA_API_KEY in development mode allows requests
  it('MW-004: allows requests when NODA_API_KEY is not set in development', async () => {
    delete process.env.NODA_API_KEY;
    process.env.NODE_ENV = 'development';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  // MW-005: Public route whitelist allows without auth
  it('MW-005: allows public routes without authentication', async () => {
    process.env.NODA_API_KEY = 'test-key';
    process.env.NODE_ENV = 'production';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/admin/health', {
      method: 'GET',
      // No x-api-key header
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  // MW-006: Non-API routes pass through without checks
  it('MW-006: non-API routes pass through without auth checks', async () => {
    process.env.NODA_API_KEY = 'test-key';
    process.env.NODE_ENV = 'production';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/dashboard', {
      method: 'GET',
      // No x-api-key header
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  // MW-007: TRACE method is blocked with 405
  // NextRequest constructor rejects TRACE method, so we mock the method property
  it('MW-007: blocks TRACE method with 405', async () => {
    process.env.NODA_API_KEY = 'test-key';
    process.env.NODE_ENV = 'development';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/scan', { method: 'GET' });
    // Override method to TRACE since NextRequest rejects it in constructor
    Object.defineProperty(req, 'method', { value: 'TRACE', writable: false });

    const res = await middleware(req);
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toContain('GET');
  });

  // MW-008: OPTIONS preflight requests are allowed without auth
  it('MW-008: allows OPTIONS preflight without auth', async () => {
    process.env.NODA_API_KEY = 'test-key';
    process.env.NODE_ENV = 'production';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/scan', {
      method: 'OPTIONS',
    });

    const res = await middleware(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('x-api-key');
  });

  // MW-009: Content-Type validation on POST (valid JSON)
  it('MW-009: accepts application/json content-type on POST', async () => {
    delete process.env.NODA_API_KEY;
    process.env.NODE_ENV = 'development';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  // MW-010: Content-Type validation on POST (invalid type)
  it('MW-010: rejects unsupported Content-Type on POST', async () => {
    delete process.env.NODA_API_KEY;
    process.env.NODE_ENV = 'development';

    const { middleware } = await import('@/middleware');
    const req = createApiRequest('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
    });

    const res = await middleware(req);
    expect(res.status).toBe(415);

    const body = await res.json();
    expect(body.error).toContain('Unsupported Media Type');
  });

  // MW-011: Auth failure triggers audit logging
  it('MW-011: logs auth failure to audit logger', async () => {
    process.env.NODA_API_KEY = 'test-key';
    process.env.NODE_ENV = 'production';
    process.env.TRUSTED_PROXY = 'true'; // PT-RATELIM-M01: X-Forwarded-For only trusted with TRUSTED_PROXY

    const auditModule = await import('@/lib/audit-logger');
    const { middleware } = await import('@/middleware');

    const req = createApiRequest('/api/scan', {
      method: 'POST',
      headers: {
        'x-api-key': 'wrong-key',
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.100',
      },
    });

    await middleware(req);

    // Give the fire-and-forget audit log a tick to execute
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(auditModule.auditLog.authFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/scan',
        ip: '192.168.1.100',
      })
    );
  });

  // MW-012: Client IP extraction from x-forwarded-for (first IP)
  it('MW-012: extracts first IP from x-forwarded-for header', async () => {
    process.env.NODA_API_KEY = 'test-key';
    process.env.NODE_ENV = 'production';
    process.env.TRUSTED_PROXY = 'true'; // PT-RATELIM-M01: X-Forwarded-For only trusted with TRUSTED_PROXY

    const auditModule = await import('@/lib/audit-logger');
    const { middleware } = await import('@/middleware');

    const req = createApiRequest('/api/scan', {
      method: 'POST',
      headers: {
        'x-api-key': 'wrong-key',
        'content-type': 'application/json',
        'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3',
      },
    });

    await middleware(req);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(auditModule.auditLog.authFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '10.0.0.1',
      })
    );
  });
});
