/**
 * File: compliance/route.test.ts
 * Purpose: Tests for GET /api/compliance API route
 * Source: src/app/api/compliance/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock api-auth to bypass auth in tests
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

// Mock file-storage to return empty executions
vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    queryExecutions: vi.fn().mockResolvedValue({ executions: [] }),
  },
}));

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:42001/api/compliance');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('GET /api/compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns frameworks array with summary', async () => {
    const { GET } = await import('@/app/api/compliance/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('frameworks');
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('lastUpdated');
    expect(Array.isArray(body.frameworks)).toBe(true);
    expect(body.frameworks.length).toBeGreaterThan(0);
  });

  it('includes BAISS framework by default', async () => {
    const { GET } = await import('@/app/api/compliance/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    const baissFramework = body.frameworks.find(
      (f: { id: string }) => f.id === 'baiss'
    );
    expect(baissFramework).toBeDefined();
    expect(baissFramework.name).toContain('BAISS');
    // BAISS metadata should be present
    expect(body).toHaveProperty('baiss');
    expect(body.baiss).toHaveProperty('summary');
    expect(body.baiss).toHaveProperty('categories');
  });

  it('excludes BAISS when ?baiss=false', async () => {
    const { GET } = await import('@/app/api/compliance/route');

    const req = createGetRequest({ baiss: 'false' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    const baissFramework = body.frameworks.find(
      (f: { id: string }) => f.id === 'baiss'
    );
    expect(baissFramework).toBeUndefined();
    // BAISS metadata should not be present
    expect(body.baiss).toBeUndefined();
  });

  it('returns proper summary stats', async () => {
    const { GET } = await import('@/app/api/compliance/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.summary).toHaveProperty('totalFrameworks');
    expect(body.summary).toHaveProperty('avgCoverage');
    expect(body.summary).toHaveProperty('openGaps');
    expect(body.summary).toHaveProperty('inProgressGaps');
    expect(body.summary).toHaveProperty('closedGaps');
    expect(body.summary).toHaveProperty('coveredControls');
    expect(typeof body.summary.totalFrameworks).toBe('number');
    expect(typeof body.summary.avgCoverage).toBe('number');
    expect(body.summary.totalFrameworks).toBe(body.frameworks.length);
    expect(body.summary.avgCoverage).toBeGreaterThan(0);
    expect(body.summary.avgCoverage).toBeLessThanOrEqual(100);
  });

  it('each framework has expected structure', async () => {
    const { GET } = await import('@/app/api/compliance/route');

    const req = createGetRequest();
    const res = await GET(req);

    const body = await res.json();
    for (const fw of body.frameworks) {
      expect(fw).toHaveProperty('id');
      expect(fw).toHaveProperty('name');
      expect(fw).toHaveProperty('version');
      expect(fw).toHaveProperty('overallCoverage');
      expect(fw).toHaveProperty('controls');
      expect(fw).toHaveProperty('lastAssessed');
      expect(Array.isArray(fw.controls)).toBe(true);
    }
  });

  it('includes dynamic metadata by default', async () => {
    const { GET } = await import('@/app/api/compliance/route');

    const req = createGetRequest();
    const res = await GET(req);

    const body = await res.json();
    expect(body).toHaveProperty('dynamic');
    expect(body.dynamic).toHaveProperty('totalExecutions');
    expect(body.dynamic.totalExecutions).toBe(0);
  });
});
