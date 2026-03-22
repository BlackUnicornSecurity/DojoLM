/**
 * File: ronin/programs/route.test.ts
 * Purpose: Tests for GET /api/ronin/programs API route
 * Source: src/app/api/ronin/programs/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock api-auth to bypass auth in tests
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

// Mock api-error to pass through
vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:42001/api/ronin/programs');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('GET /api/ronin/programs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns programs array with total count', async () => {
    const { GET } = await import('@/app/api/ronin/programs/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('programs');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.programs)).toBe(true);
    expect(body.total).toBe(body.programs.length);
    expect(body.programs.length).toBeGreaterThan(0);
  });

  it('filters by platform', async () => {
    const { GET } = await import('@/app/api/ronin/programs/route');

    const req = createGetRequest({ platform: 'hackerone' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.programs)).toBe(true);
    for (const prog of body.programs) {
      expect(prog.platform).toBe('hackerone');
    }
  });

  it('filters by search term', async () => {
    const { GET } = await import('@/app/api/ronin/programs/route');

    // Use a known company from seed data
    const req = createGetRequest({ search: 'openai' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.programs)).toBe(true);
    // At least one result should match
    expect(body.programs.length).toBeGreaterThanOrEqual(1);
  });

  it('returns single program detail by ?id=xxx', async () => {
    const { GET } = await import('@/app/api/ronin/programs/route');

    const req = createGetRequest({ id: 'prog-001' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('program');
    expect(body.program.id).toBe('prog-001');
  });

  it('returns 404 for non-existent program ID', async () => {
    const { GET } = await import('@/app/api/ronin/programs/route');

    const req = createGetRequest({ id: 'non-existent-id-999' });
    const res = await GET(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  it('includes Cache-Control private header', async () => {
    const { GET } = await import('@/app/api/ronin/programs/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const cacheControl = res.headers.get('Cache-Control');
    expect(cacheControl).toContain('private');
  });
});
