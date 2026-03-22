/**
 * File: ecosystem/findings/route.test.ts
 * Purpose: Tests for GET/POST /api/ecosystem/findings API route
 * Source: src/app/api/ecosystem/findings/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock api-auth to bypass auth in tests
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

// Mock ecosystem storage
vi.mock('@/lib/storage/ecosystem-storage', () => ({
  saveFinding: vi.fn().mockImplementation(async (finding: unknown) => finding),
  queryFindings: vi.fn().mockResolvedValue({ findings: [], total: 0 }),
  getEcosystemStats: vi.fn().mockResolvedValue({
    totalFindings: 0,
    findings24h: 0,
    byModule: {},
    byType: {},
    bySeverity: {},
    activeModules: [],
    lastFindingAt: null,
  }),
}));

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:42001/api/ecosystem/findings');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/ecosystem/findings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validFindingBody() {
  return {
    sourceModule: 'scanner',
    findingType: 'vulnerability',
    severity: 'CRITICAL',
    title: 'Test vulnerability finding',
    description: 'A detailed description of the finding.',
  };
}

describe('GET /api/ecosystem/findings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns findings array', async () => {
    const { GET } = await import('@/app/api/ecosystem/findings/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  it('returns aggregated stats in stats mode', async () => {
    const { GET } = await import('@/app/api/ecosystem/findings/route');

    const req = createGetRequest({ mode: 'stats' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('totalFindings');
  });

  it('filters by sourceModule', async () => {
    const { queryFindings } = await import('@/lib/storage/ecosystem-storage');
    const { GET } = await import('@/app/api/ecosystem/findings/route');

    const req = createGetRequest({ sourceModule: 'scanner' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(queryFindings).toHaveBeenCalledWith(
      expect.objectContaining({ sourceModule: 'scanner' })
    );
  });

  it('filters by severity', async () => {
    const { queryFindings } = await import('@/lib/storage/ecosystem-storage');
    const { GET } = await import('@/app/api/ecosystem/findings/route');

    const req = createGetRequest({ severity: 'CRITICAL' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(queryFindings).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'CRITICAL' })
    );
  });

  it('filters by findingType', async () => {
    const { queryFindings } = await import('@/lib/storage/ecosystem-storage');
    const { GET } = await import('@/app/api/ecosystem/findings/route');

    const req = createGetRequest({ findingType: 'vulnerability' });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(queryFindings).toHaveBeenCalledWith(
      expect.objectContaining({ findingType: 'vulnerability' })
    );
  });

  it('rejects invalid sourceModule', async () => {
    const { GET } = await import('@/app/api/ecosystem/findings/route');

    const req = createGetRequest({ sourceModule: 'invalid-module' });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid sourceModule');
  });

  it('rejects invalid severity', async () => {
    const { GET } = await import('@/app/api/ecosystem/findings/route');

    const req = createGetRequest({ severity: 'invalid-severity' });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid severity');
  });

  it('rejects invalid findingType', async () => {
    const { GET } = await import('@/app/api/ecosystem/findings/route');

    const req = createGetRequest({ findingType: 'bogus' });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid findingType');
  });
});

describe('POST /api/ecosystem/findings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates finding with valid data (returns 201)', async () => {
    const { POST } = await import('@/app/api/ecosystem/findings/route');

    const req = createPostRequest(validFindingBody());
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
    expect(body.data.title).toBe('Test vulnerability finding');
    expect(body.data.sourceModule).toBe('scanner');
  });

  it('rejects missing sourceModule', async () => {
    const { POST } = await import('@/app/api/ecosystem/findings/route');

    const payload = { ...validFindingBody() };
    delete (payload as Record<string, unknown>).sourceModule;

    const req = createPostRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('sourceModule');
  });

  it('rejects missing title', async () => {
    const { POST } = await import('@/app/api/ecosystem/findings/route');

    const payload = { ...validFindingBody() };
    delete (payload as Record<string, unknown>).title;

    const req = createPostRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('title');
  });

  it('rejects title exceeding 500 chars', async () => {
    const { POST } = await import('@/app/api/ecosystem/findings/route');

    const payload = { ...validFindingBody(), title: 'A'.repeat(501) };

    const req = createPostRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('500');
  });

  it('rejects missing description', async () => {
    const { POST } = await import('@/app/api/ecosystem/findings/route');

    const payload = { ...validFindingBody() };
    delete (payload as Record<string, unknown>).description;

    const req = createPostRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('description');
  });

  it('rejects invalid JSON body', async () => {
    const { POST } = await import('@/app/api/ecosystem/findings/route');

    const req = new NextRequest('http://localhost:42001/api/ecosystem/findings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-valid-json{{{',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON');
  });
});
