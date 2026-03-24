/**
 * File: admin/health/route.test.ts
 * Purpose: Tests for GET /api/admin/health API route
 * Source: src/app/api/admin/health/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Auth handled by the API proxy — no per-route checkApiAuth needed

// Mock the scanner module (dynamically imported inside the route)
vi.mock('@dojolm/scanner', () => ({
  scan: vi.fn().mockReturnValue({ verdict: 'ALLOW', findings: [] }),
}));

// Mock guard-storage (dynamically imported inside the route)
vi.mock('@/lib/storage/guard-storage', () => ({
  getGuardConfig: vi.fn().mockResolvedValue({ enabled: false, mode: 'shinobi' }),
  getGuardStats: vi.fn().mockResolvedValue({ totalEvents: 0 }),
}));

// Mock storage-interface (dynamically imported inside the route)
vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    getModelConfigs: vi.fn().mockResolvedValue([]),
  }),
}));

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/admin/health', {
    method: 'GET',
  });
}

describe('GET /api/admin/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with health status', async () => {
    const { GET } = await import('@/app/api/admin/health/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    // Check top-level health sections
    expect(body).toHaveProperty('scanner');
    expect(body).toHaveProperty('guard');
    expect(body).toHaveProperty('storage');
    expect(body).toHaveProperty('app');

    // Scanner section
    expect(body.scanner).toHaveProperty('reachable');
    expect(typeof body.scanner.reachable).toBe('boolean');

    // Guard section
    expect(body.guard).toHaveProperty('enabled');
    expect(body.guard).toHaveProperty('mode');
    expect(body.guard).toHaveProperty('eventCount');

    // Storage section
    expect(body.storage).toHaveProperty('type');
    expect(body.storage).toHaveProperty('modelsCount');

    // App section
    expect(body.app).toHaveProperty('version');
    expect(typeof body.app.version).toBe('string');
    // R3-010: nodeVersion removed to prevent fingerprinting
    expect(body.app).not.toHaveProperty('nodeVersion');
    expect(body.app).toHaveProperty('responseTimeMs');
  });

  it('includes security headers', async () => {
    const { GET } = await import('@/app/api/admin/health/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns valid structure even if scanner fails', async () => {
    // Override scanner mock to throw
    const scanner = await import('@dojolm/scanner');
    vi.mocked(scanner.scan).mockImplementationOnce(() => {
      throw new Error('Scanner unavailable');
    });

    const { GET } = await import('@/app/api/admin/health/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scanner.reachable).toBe(false);
  });
});
