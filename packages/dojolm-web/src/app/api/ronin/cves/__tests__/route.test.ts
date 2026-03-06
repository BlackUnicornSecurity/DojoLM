/**
 * File: ronin/cves/route.test.ts
 * Purpose: Tests for GET /api/ronin/cves API route
 * Source: src/app/api/ronin/cves/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock api-auth to bypass auth in tests
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

// Mock api-error
vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/ronin/cves');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('GET /api/ronin/cves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns CVE array', async () => {
    const { GET } = await import('@/app/api/ronin/cves/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('cves');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.cves)).toBe(true);
    expect(body.cves.length).toBeGreaterThan(0);
  });

  it('each CVE has expected structure', async () => {
    const { GET } = await import('@/app/api/ronin/cves/route');

    const req = createGetRequest();
    const res = await GET(req);

    const body = await res.json();
    for (const cve of body.cves) {
      expect(cve).toHaveProperty('id');
      expect(cve).toHaveProperty('summary');
      expect(cve).toHaveProperty('severity');
      expect(cve).toHaveProperty('published');
      expect(cve).toHaveProperty('references');
      expect(cve).toHaveProperty('aiRelevant');
      expect(cve.id).toMatch(/^CVE-\d{4}-\d+$/);
    }
  });

  it('filters by severity', async () => {
    const { GET } = await import('@/app/api/ronin/cves/route');

    const req = createGetRequest({ severity: 'CRITICAL' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    for (const cve of body.cves) {
      expect(cve.severity).toBe('CRITICAL');
    }
  });

  it('respects limit parameter', async () => {
    const { GET } = await import('@/app/api/ronin/cves/route');

    const req = createGetRequest({ limit: '2' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cves.length).toBeLessThanOrEqual(2);
  });

  it('ignores invalid severity filter', async () => {
    const { GET } = await import('@/app/api/ronin/cves/route');

    const req = createGetRequest({ severity: 'BOGUS' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    // Should return all results (filter not applied for invalid value)
    expect(body.cves.length).toBeGreaterThan(0);
  });
});
