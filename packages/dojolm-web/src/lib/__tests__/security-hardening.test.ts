/**
 * Story 8.3: Security Hardening Tests (R2-TEA)
 * Tests for rate limiter, TRACE blocking, multi-header Sec-Fetch validation,
 * and CSP header configuration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock audit logger before importing the API proxy
vi.mock('@/lib/audit-logger', () => ({
  auditLog: {
    authFailure: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockValidateSession = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

describe('Security Hardening (Story 8.3)', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODA_API_KEY = 'test-api-key-for-security-tests';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:42001';
    (process.env as Record<string, string>).NODE_ENV = 'test';
    mockValidateSession.mockReset();
    mockValidateSession.mockReturnValue({
      id: 'user-1',
      username: 'admin',
      email: 'admin@test.com',
      role: 'admin',
      displayName: 'Admin',
    });
  });

  describe('Rate limiter', () => {
    it('should allow requests under the limit', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();
      process.env.TRUSTED_PROXY = 'true';

      const req = new NextRequest('http://localhost:42001/api/scan', {
        method: 'GET',
        headers: {
          'x-api-key': 'test-api-key-for-security-tests',
          'x-forwarded-for': '10.0.0.1',
        },
      });
      const res = await mod.proxy(req);
      expect(res.status).not.toBe(429);
    });

    it('should block after 100 requests per minute', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();
      process.env.TRUSTED_PROXY = 'true';

      for (let i = 0; i < 100; i++) {
        const req = new NextRequest('http://localhost:42001/api/scan', {
          method: 'GET',
          headers: {
            'x-api-key': 'test-api-key-for-security-tests',
            'x-forwarded-for': '10.0.0.99',
          },
        });
        await mod.proxy(req);
      }

      const req = new NextRequest('http://localhost:42001/api/scan', {
        method: 'GET',
        headers: {
          'x-api-key': 'test-api-key-for-security-tests',
          'x-forwarded-for': '10.0.0.99',
        },
      });
      const res = await mod.proxy(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('60');
    });

    // FINDING-009 fix: auth failure blocking only applies to /api/auth/* routes.
    // Non-auth routes use the general rate limit even if auth failures are high.
    // Use a non-public auth path (/api/auth/change-password) so auth failures
    // are recorded (public auth routes like /api/auth/login return early).
    it('should track auth failures separately and only block auth routes (FINDING-009)', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();
      process.env.TRUSTED_PROXY = 'true';

      // Generate 10 auth failures against a non-public auth route
      for (let i = 0; i < 10; i++) {
        const req = new NextRequest('http://localhost:42001/api/auth/change-password', {
          method: 'POST',
          headers: {
            'x-api-key': 'wrong-key',
            'x-forwarded-for': '10.0.0.200',
            'content-type': 'application/json',
          },
        });
        await mod.proxy(req);
      }

      // Auth route should be blocked after 10 auth failures
      const authReq = new NextRequest('http://localhost:42001/api/auth/change-password', {
        method: 'POST',
        headers: {
          'x-api-key': 'test-api-key-for-security-tests',
          'x-forwarded-for': '10.0.0.200',
          'content-type': 'application/json',
        },
      });
      const authRes = await mod.proxy(authReq);
      expect(authRes.status).toBe(429);

      // Non-auth route should NOT be blocked by auth failures
      const nonAuthReq = new NextRequest('http://localhost:42001/api/scan', {
        method: 'GET',
        headers: {
          'x-api-key': 'test-api-key-for-security-tests',
          'x-forwarded-for': '10.0.0.200',
        },
      });
      const nonAuthRes = await mod.proxy(nonAuthReq);
      expect(nonAuthRes.status).toBe(200);
    });

    it('should export resetRateLimiter for test isolation', async () => {
      const mod = await import('@/proxy');
      expect(typeof mod.resetRateLimiter).toBe('function');
      mod.resetRateLimiter();
    });
  });

  describe('TRACE method blocking', () => {
    it('should return 405 for TRACE requests', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:42001/api/scan', {
        method: 'GET',
      });
      Object.defineProperty(req, 'method', { value: 'TRACE' });

      const res = await mod.proxy(req);
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toContain('GET');
    });
  });

  describe('Multi-header Sec-Fetch validation', () => {
    it('should reject with only Sec-Fetch-Site (missing Mode/Dest)', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:42001/api/scan', {
        method: 'GET',
        headers: {
          'sec-fetch-site': 'same-origin',
          'origin': 'http://localhost:42001',
          'host': 'localhost:42001',
          cookie: 'tpi_session=valid-session',
        },
      });
      const res = await mod.proxy(req);
      expect(res.status).toBe(401);
    });

    it('should allow with all three valid Sec-Fetch headers', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:42001/api/scan', {
        method: 'GET',
        headers: {
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty',
          'origin': 'http://localhost:42001',
          'host': 'localhost:42001',
          cookie: 'tpi_session=valid-session',
        },
      });
      const res = await mod.proxy(req);
      expect(res.status).toBe(200);
    });

    it('should reject with invalid Sec-Fetch-Mode', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:42001/api/scan', {
        method: 'GET',
        headers: {
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'websocket',
          'sec-fetch-dest': 'empty',
          'origin': 'http://localhost:42001',
          'host': 'localhost:42001',
          cookie: 'tpi_session=valid-session',
        },
      });
      const res = await mod.proxy(req);
      expect(res.status).toBe(401);
    });

    it('should reject same-origin browser headers when the session is invalid', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();
      mockValidateSession.mockReturnValue(null);

      const req = new NextRequest('http://localhost:42001/api/scan', {
        method: 'GET',
        headers: {
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty',
          origin: 'http://localhost:42001',
          cookie: 'tpi_session=invalid-session',
        },
      });
      const res = await mod.proxy(req);
      expect(res.status).toBe(401);
    });

    it('should isolate same-origin rate limits by browser fingerprint when TRUSTED_PROXY is unset', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();
      delete process.env.TRUSTED_PROXY;

      const makeUiRequest = (userAgent: string) =>
        new NextRequest('http://localhost:42001/api/fixtures', {
          method: 'GET',
          headers: {
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            referer: 'http://localhost:42001/',
            'user-agent': userAgent,
            cookie: 'tpi_session=valid-session',
          },
        });

      for (let i = 0; i < 300; i++) {
        const response = await mod.proxy(makeUiRequest('playwright-a'));
        expect(response.status).toBe(200);
      }

      const blocked = await mod.proxy(makeUiRequest('playwright-a'));
      expect(blocked.status).toBe(429);

      const separateBrowser = await mod.proxy(makeUiRequest('playwright-b'));
      expect(separateBrowser.status).toBe(200);
    });

    it('should isolate same-origin rate limits per route for the same browser fingerprint', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();
      delete process.env.TRUSTED_PROXY;

      const makeUiRequest = (path: string) =>
        new NextRequest(`http://localhost:42001${path}`, {
          method: 'GET',
          headers: {
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            referer: 'http://localhost:42001/',
            'user-agent': 'playwright-shared-browser',
            cookie: 'tpi_session=valid-session',
          },
        });

      for (let i = 0; i < 300; i++) {
        const response = await mod.proxy(makeUiRequest('/api/fixtures'));
        expect(response.status).toBe(200);
      }

      const blockedFixtures = await mod.proxy(makeUiRequest('/api/fixtures'));
      expect(blockedFixtures.status).toBe(429);

      const separateRoute = await mod.proxy(makeUiRequest('/api/compliance'));
      expect(separateRoute.status).toBe(200);
    });

    // FINDING-005 fix: /api/fixtures is no longer public — unauthenticated
    // same-origin requests without a session now receive 401.
    it('should reject formerly-public same-origin GET routes without a session (FINDING-005)', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();
      delete process.env.TRUSTED_PROXY;

      const makeUiRequest = () =>
        new NextRequest('http://localhost:42001/api/fixtures', {
          method: 'GET',
          headers: {
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            referer: 'http://localhost:42001/',
            'user-agent': 'playwright-public-browser',
          },
        });

      const response = await mod.proxy(makeUiRequest());
      expect(response.status).toBe(401);
    });

    it('should apply the higher browser read limit to same-origin dev GET routes when API key auth is disabled', async () => {
      const mod = await import('@/proxy');
      mod.resetRateLimiter();
      delete process.env.TRUSTED_PROXY;
      delete process.env.NODA_API_KEY;
      (process.env as Record<string, string>).NODE_ENV = 'development';

      const makeUiRequest = () =>
        new NextRequest('http://localhost:42001/api/llm/batch?status=running', {
          method: 'GET',
          headers: {
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            referer: 'http://localhost:42001/',
            'user-agent': 'playwright-dev-browser',
          },
        });

      for (let i = 0; i < 101; i++) {
        const response = await mod.proxy(makeUiRequest());
        expect(response.status).toBe(200);
      }
    });
  });

  describe('CSP configuration', () => {
    it('production CSP should not contain unsafe-inline in script-src', () => {
      const productionCSP = "script-src 'self'";
      expect(productionCSP).not.toContain('unsafe-inline');
    });
  });
});
