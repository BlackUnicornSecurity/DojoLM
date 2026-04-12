/**
 * File: admin/health/route.test.ts
 * Purpose: Tests for GET /api/admin/health API route
 * Source: src/app/api/admin/health/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock checkApiAuth to return null (authenticated) when session cookie present
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn((req: NextRequest) => {
    const session = req.cookies.get('tpi_session')?.value;
    return session ? null : { status: 401 };
  }),
  isDemoMode: vi.fn(() => false),
}));

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

function createGetRequest(withSession = false): NextRequest {
  const req = new NextRequest('http://localhost:42001/api/admin/health', {
    method: 'GET',
  });
  if (withSession) {
    req.cookies.set('tpi_session', 'valid-test-session-token');
  }
  return req;
}

describe('GET /api/admin/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns minimal response for unauthenticated callers', async () => {
    const { GET } = await import('@/app/api/admin/health/route');

    const req = createGetRequest(false);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    // Unauthenticated: only status + timestamp, no internals
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).not.toHaveProperty('scanner');
    expect(body).not.toHaveProperty('guard');
    expect(body).not.toHaveProperty('storage');
  });

  it('returns full health status for authenticated callers', async () => {
    const { GET } = await import('@/app/api/admin/health/route');

    const req = createGetRequest(true);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('scanner');
    expect(body).toHaveProperty('guard');
    expect(body).toHaveProperty('storage');
    expect(body).toHaveProperty('app');

    expect(body.scanner).toHaveProperty('reachable');
    expect(typeof body.scanner.reachable).toBe('boolean');

    expect(body.guard).toHaveProperty('enabled');
    expect(body.guard).toHaveProperty('mode');
    expect(body.guard).toHaveProperty('eventCount');

    expect(body.storage).toHaveProperty('type');
    expect(body.storage).toHaveProperty('modelsCount');

    expect(body.app).toHaveProperty('version');
    expect(typeof body.app.version).toBe('string');
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
    const scanner = await import('@dojolm/scanner');
    vi.mocked(scanner.scan).mockImplementationOnce(() => {
      throw new Error('Scanner unavailable');
    });

    const { GET } = await import('@/app/api/admin/health/route');

    const req = createGetRequest(true);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scanner.reachable).toBe(false);
  });
});
