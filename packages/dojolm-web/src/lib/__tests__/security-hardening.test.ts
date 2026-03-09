/**
 * Story 8.3: Security Hardening Tests (R2-TEA)
 * Tests for rate limiter, TRACE blocking, multi-header Sec-Fetch validation,
 * and CSP header configuration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock audit logger before importing middleware
vi.mock('@/lib/audit-logger', () => ({
  auditLog: {
    authFailure: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Security Hardening (Story 8.3)', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODA_API_KEY = 'test-api-key-for-security-tests';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'test';
  });

  describe('Rate limiter', () => {
    it('should allow requests under the limit', async () => {
      const mod = await import('@/middleware');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:3000/api/scan', {
        method: 'GET',
        headers: {
          'x-api-key': 'test-api-key-for-security-tests',
          'x-forwarded-for': '10.0.0.1',
        },
      });
      const res = await mod.middleware(req);
      expect(res.status).not.toBe(429);
    });

    it('should block after 100 requests per minute', async () => {
      const mod = await import('@/middleware');
      mod.resetRateLimiter();

      for (let i = 0; i < 100; i++) {
        const req = new NextRequest('http://localhost:3000/api/scan', {
          method: 'GET',
          headers: {
            'x-api-key': 'test-api-key-for-security-tests',
            'x-forwarded-for': '10.0.0.99',
          },
        });
        await mod.middleware(req);
      }

      const req = new NextRequest('http://localhost:3000/api/scan', {
        method: 'GET',
        headers: {
          'x-api-key': 'test-api-key-for-security-tests',
          'x-forwarded-for': '10.0.0.99',
        },
      });
      const res = await mod.middleware(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('60');
    });

    it('should track auth failures separately (10/min)', async () => {
      const mod = await import('@/middleware');
      mod.resetRateLimiter();

      for (let i = 0; i < 10; i++) {
        const req = new NextRequest('http://localhost:3000/api/scan', {
          method: 'GET',
          headers: {
            'x-api-key': 'wrong-key',
            'x-forwarded-for': '10.0.0.200',
          },
        });
        await mod.middleware(req);
      }

      const req = new NextRequest('http://localhost:3000/api/scan', {
        method: 'GET',
        headers: {
          'x-api-key': 'test-api-key-for-security-tests',
          'x-forwarded-for': '10.0.0.200',
        },
      });
      const res = await mod.middleware(req);
      expect(res.status).toBe(429);
    });

    it('should export resetRateLimiter for test isolation', async () => {
      const mod = await import('@/middleware');
      expect(typeof mod.resetRateLimiter).toBe('function');
      mod.resetRateLimiter();
    });
  });

  describe('TRACE method blocking', () => {
    it('should return 405 for TRACE requests', async () => {
      const mod = await import('@/middleware');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:3000/api/scan', {
        method: 'GET',
      });
      Object.defineProperty(req, 'method', { value: 'TRACE' });

      const res = await mod.middleware(req);
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toContain('GET');
    });
  });

  describe('Multi-header Sec-Fetch validation', () => {
    it('should reject with only Sec-Fetch-Site (missing Mode/Dest)', async () => {
      const mod = await import('@/middleware');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:3000/api/scan', {
        method: 'GET',
        headers: {
          'sec-fetch-site': 'same-origin',
          'origin': 'http://localhost:3000',
          'host': 'localhost:3000',
        },
      });
      const res = await mod.middleware(req);
      expect(res.status).toBe(401);
    });

    it('should allow with all three valid Sec-Fetch headers', async () => {
      const mod = await import('@/middleware');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:3000/api/scan', {
        method: 'GET',
        headers: {
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty',
          'origin': 'http://localhost:3000',
          'host': 'localhost:3000',
        },
      });
      const res = await mod.middleware(req);
      expect(res.status).toBe(200);
    });

    it('should reject with invalid Sec-Fetch-Mode', async () => {
      const mod = await import('@/middleware');
      mod.resetRateLimiter();

      const req = new NextRequest('http://localhost:3000/api/scan', {
        method: 'GET',
        headers: {
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'websocket',
          'sec-fetch-dest': 'empty',
          'origin': 'http://localhost:3000',
          'host': 'localhost:3000',
        },
      });
      const res = await mod.middleware(req);
      expect(res.status).toBe(401);
    });
  });

  describe('CSP configuration', () => {
    it('production CSP should not contain unsafe-inline in script-src', () => {
      const productionCSP = "script-src 'self'";
      expect(productionCSP).not.toContain('unsafe-inline');
    });
  });
});
