/**
 * File: ronin/submissions/route.test.ts
 * Purpose: Tests for GET/POST /api/ronin/submissions API route
 * Source: src/app/api/ronin/submissions/route.ts
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
  const url = new URL('http://localhost:42001/api/ronin/submissions');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/ronin/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validSubmissionBody() {
  return {
    id: '12345678-1234-4234-8234-123456789012',
    title: 'Test submission title',
    status: 'draft',
    severity: 'high',
    programId: 'prog-001',
    programName: 'Test Program',
    description: 'A test vulnerability submission.',
    cvssScore: 7.5,
    aiFactorScore: 0.8,
    finalScore: 8.0,
    evidence: ['Evidence item 1'],
  };
}

describe('GET /api/ronin/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns submissions list', async () => {
    const { GET } = await import('@/app/api/ronin/submissions/route');

    const req = createGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('submissions');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.submissions)).toBe(true);
  });
});

describe('POST /api/ronin/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates submission with valid data', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const req = createPostRequest(validSubmissionBody());
    const res = await POST(req);

    // 201 for new, 200 for update
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('submission');
    expect(body.submission.title).toBe('Test submission title');
    expect(body.submission.severity).toBe('high');
  });

  it('rejects missing required id', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const payload = { ...validSubmissionBody() };
    delete (payload as Record<string, unknown>).id;

    const req = createPostRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('id');
  });

  it('rejects missing required title', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const payload = { ...validSubmissionBody(), title: '' };

    const req = createPostRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('title');
  });

  it('rejects invalid id format (non-UUID)', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const payload = { ...validSubmissionBody(), id: 'not-a-uuid' };

    const req = createPostRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('id');
  });

  it('rejects invalid severity', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const payload = { ...validSubmissionBody(), severity: 'mega-critical' };

    const req = createPostRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('severity');
  });

  it('rejects invalid JSON body', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const req = new NextRequest('http://localhost:42001/api/ronin/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-valid-json',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON');
  });

  it('clamps cvssScore to 0-10 range', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const payload = { ...validSubmissionBody(), cvssScore: 99 };

    const req = createPostRequest(payload);
    const res = await POST(req);

    const body = await res.json();
    expect(body.submission.cvssScore).toBeLessThanOrEqual(10);
  });
});
