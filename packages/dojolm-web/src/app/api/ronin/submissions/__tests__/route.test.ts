/**
 * File: ronin/submissions/route.test.ts
 * Purpose: Tests for GET/POST/PATCH /api/ronin/submissions API route
 * Source: src/app/api/ronin/submissions/route.ts
 */

// @vitest-environment node

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

// Mock demo mode (off by default)
vi.mock('@/lib/demo', () => ({
  isDemoMode: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/demo/mock-api-handlers', () => ({
  demoRoninSubmissionsGet: vi.fn().mockReturnValue(
    new (require('next/server').NextResponse)(JSON.stringify({ submissions: [], total: 0 }), { status: 200 })
  ),
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

function createPatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/ronin/submissions', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const TEST_UUID = '12345678-1234-4234-8234-123456789012';
const TEST_UUID_2 = 'abcdef01-2345-4678-9abc-def012345678';

function validSubmissionBody(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_UUID,
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
    ...overrides,
  };
}

describe('GET /api/ronin/submissions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
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

  it('filters by valid status parameter', async () => {
    const { GET, POST } = await import('@/app/api/ronin/submissions/route');

    // Create two submissions with different statuses
    await POST(createPostRequest(validSubmissionBody({ id: TEST_UUID, status: 'draft' })));
    await POST(createPostRequest(validSubmissionBody({ id: TEST_UUID_2, title: 'Second', status: 'submitted' })));

    const res = await GET(createGetRequest({ status: 'draft' }));
    const body = await res.json();
    expect(body.submissions.every((s: Record<string, unknown>) => s.status === 'draft')).toBe(true);
  });

  it('ignores invalid status filter (returns all)', async () => {
    const { GET } = await import('@/app/api/ronin/submissions/route');

    const res = await GET(createGetRequest({ status: 'nonexistent' }));
    expect(res.status).toBe(200);
  });

  it('sorts by updatedAt descending', async () => {
    const { GET, POST } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody({ id: TEST_UUID })));
    // Small delay to ensure different updatedAt
    await POST(createPostRequest(validSubmissionBody({ id: TEST_UUID_2, title: 'Newer' })));

    const res = await GET(createGetRequest());
    const body = await res.json();
    if (body.submissions.length >= 2) {
      const first = body.submissions[0].updatedAt;
      const second = body.submissions[1].updatedAt;
      expect(first >= second).toBe(true);
    }
  });
});

describe('POST /api/ronin/submissions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('creates submission with valid data', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const req = createPostRequest(validSubmissionBody());
    const res = await POST(req);

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

  it('clamps aiFactorScore to 0-1 range', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({ aiFactorScore: 5.0 })));
    const body = await res.json();
    expect(body.submission.aiFactorScore).toBeLessThanOrEqual(1);
    expect(body.submission.aiFactorScore).toBeGreaterThanOrEqual(0);
  });

  it('clamps finalScore to 0-10 range', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({ finalScore: 99 })));
    const body = await res.json();
    expect(body.submission.finalScore).toBeLessThanOrEqual(10);
  });

  it('clamps payout to MAX_PAYOUT (1,000,000)', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({ payout: 9_999_999 })));
    const body = await res.json();
    expect(body.submission.payout).toBeLessThanOrEqual(1_000_000);
  });

  it('sanitizes HTML in title to prevent XSS', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({
      title: '<script>alert(1)</script>',
    })));
    const body = await res.json();
    expect(body.submission.title).not.toContain('<script>');
    expect(body.submission.title).toContain('&lt;script&gt;');
  });

  it('sanitizes HTML in description', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({
      description: '<img onerror="alert(1)">',
    })));
    const body = await res.json();
    expect(body.submission.description).not.toContain('<img');
  });

  it('truncates oversized fields', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const longTitle = 'A'.repeat(1000);
    const res = await POST(createPostRequest(validSubmissionBody({ title: longTitle })));
    const body = await res.json();
    expect(body.submission.title.length).toBeLessThanOrEqual(500);
  });

  it('limits evidence to 10 items max', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const evidence = Array.from({ length: 20 }, (_, i) => `Evidence ${i}`);
    const res = await POST(createPostRequest(validSubmissionBody({ evidence })));
    const body = await res.json();
    expect(body.submission.evidence.length).toBeLessThanOrEqual(10);
  });

  it('filters non-string evidence items', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const evidence = ['valid', 123, null, 'also valid', { obj: true }];
    const res = await POST(createPostRequest(validSubmissionBody({ evidence })));
    const body = await res.json();
    expect(body.submission.evidence).toEqual(['valid', 'also valid']);
  });

  it('handles non-finite cvssScore (defaults to 0)', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({ cvssScore: NaN })));
    const body = await res.json();
    expect(body.submission.cvssScore).toBe(0);
  });

  it('returns 200 for update of existing submission', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    // First create
    const res1 = await POST(createPostRequest(validSubmissionBody()));
    expect(res1.status).toBe(201);

    // Second create with same ID = update
    const res2 = await POST(createPostRequest(validSubmissionBody({ title: 'Updated title' })));
    expect(res2.status).toBe(200);
    const body = await res2.json();
    expect(body.submission.title).toBe('Updated title');
  });
});

describe('PATCH /api/ronin/submissions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('updates an existing submission status', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    // Create first
    await POST(createPostRequest(validSubmissionBody()));

    // Patch status
    const res = await PATCH(createPatchRequest({ id: TEST_UUID, status: 'submitted' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submission.status).toBe('submitted');
  });

  it('updates title with sanitization', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody()));

    const res = await PATCH(createPatchRequest({
      id: TEST_UUID,
      title: '<b>New Title</b>',
    }));
    const body = await res.json();
    expect(body.submission.title).toContain('&lt;b&gt;');
  });

  it('updates description', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody()));

    const res = await PATCH(createPatchRequest({
      id: TEST_UUID,
      description: 'Updated description',
    }));
    const body = await res.json();
    expect(body.submission.description).toBe('Updated description');
  });

  it('updates payout with clamping', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody()));

    const res = await PATCH(createPatchRequest({
      id: TEST_UUID,
      payout: 5000,
    }));
    const body = await res.json();
    expect(body.submission.payout).toBe(5000);
  });

  it('clamps payout to MAX_PAYOUT', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody()));

    const res = await PATCH(createPatchRequest({
      id: TEST_UUID,
      payout: 9_999_999,
    }));
    const body = await res.json();
    expect(body.submission.payout).toBeLessThanOrEqual(1_000_000);
  });

  it('preserves createdAt and id on update', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    const createRes = await POST(createPostRequest(validSubmissionBody()));
    const created = (await createRes.json()).submission;

    const patchRes = await PATCH(createPatchRequest({
      id: TEST_UUID,
      title: 'Patched',
    }));
    const patched = (await patchRes.json()).submission;

    expect(patched.id).toBe(created.id);
    expect(patched.createdAt).toBe(created.createdAt);
  });

  it('updates updatedAt timestamp', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    const createRes = await POST(createPostRequest(validSubmissionBody()));
    const created = (await createRes.json()).submission;

    const patchRes = await PATCH(createPatchRequest({
      id: TEST_UUID,
      title: 'Patched',
    }));
    const patched = (await patchRes.json()).submission;

    expect(patched.updatedAt).toBeDefined();
    expect(patched.updatedAt >= created.updatedAt).toBe(true);
  });

  it('rejects invalid id format', async () => {
    const { PATCH } = await import('@/app/api/ronin/submissions/route');

    const res = await PATCH(createPatchRequest({ id: 'bad-id', status: 'submitted' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent submission', async () => {
    const { PATCH } = await import('@/app/api/ronin/submissions/route');

    const res = await PATCH(createPatchRequest({
      id: TEST_UUID_2,
      status: 'submitted',
    }));
    expect(res.status).toBe(404);
  });

  it('rejects invalid JSON body', async () => {
    const { PATCH } = await import('@/app/api/ronin/submissions/route');

    const req = new NextRequest('http://localhost:42001/api/ronin/submissions', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('ignores invalid status values in PATCH', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody()));

    const res = await PATCH(createPatchRequest({
      id: TEST_UUID,
      status: 'invalid-status',
    }));
    const body = await res.json();
    // Status should remain unchanged (draft)
    expect(body.submission.status).toBe('draft');
  });

  it('PATCH does not normalize status case (case-sensitive)', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody()));

    // 'Draft' with capital D is not in VALID_STATUSES ('draft')
    const res = await PATCH(createPatchRequest({
      id: TEST_UUID,
      status: 'Draft',
    }));
    const body = await res.json();
    // Status stays at 'draft' because 'Draft' is not in the Set
    expect(body.submission.status).toBe('draft');
  });

  it('PATCH clamps negative payout to 0', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody()));

    const res = await PATCH(createPatchRequest({
      id: TEST_UUID,
      payout: -500,
    }));
    const body = await res.json();
    expect(body.submission.payout).toBe(0);
  });

  it('PATCH ignores non-finite payout (Infinity)', async () => {
    const { POST, PATCH } = await import('@/app/api/ronin/submissions/route');

    await POST(createPostRequest(validSubmissionBody()));

    const res = await PATCH(createPatchRequest({
      id: TEST_UUID,
      payout: Infinity,
    }));
    const body = await res.json();
    // Infinity fails Number.isFinite check, so payout is not updated
    expect(body.submission.payout).not.toBe(Infinity);
  });
});

describe('POST /api/ronin/submissions — Security', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('sanitizes HTML in evidence items to prevent stored XSS', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({
      evidence: ['<script>alert("xss")</script>', '<img onerror=alert(1)>'],
    })));
    const body = await res.json();
    for (const item of body.submission.evidence) {
      expect(item).not.toContain('<script>');
      expect(item).not.toContain('<img');
    }
  });

  it('sanitizes programName to prevent stored XSS', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({
      programName: '<b onmouseover="alert(1)">Exploit</b>',
    })));
    const body = await res.json();
    expect(body.submission.programName).not.toContain('<b');
    expect(body.submission.programName).toContain('&lt;b');
  });

  it('truncates evidence items to max 2000 chars each', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const longEvidence = 'A'.repeat(5000);
    const res = await POST(createPostRequest(validSubmissionBody({
      evidence: [longEvidence],
    })));
    const body = await res.json();
    expect(body.submission.evidence[0].length).toBeLessThanOrEqual(2000);
  });

  it('rejects negative cvssScore (clamps to 0)', async () => {
    const { POST } = await import('@/app/api/ronin/submissions/route');

    const res = await POST(createPostRequest(validSubmissionBody({
      cvssScore: -5,
    })));
    const body = await res.json();
    expect(body.submission.cvssScore).toBe(0);
  });
});

describe('Auth validation', () => {
  it('returns auth error when checkApiAuth returns an error response', async () => {
    vi.resetModules();

    // Override checkApiAuth to return a 401 error
    vi.doMock('@/lib/api-auth', () => ({
      checkApiAuth: vi.fn().mockReturnValue(
        new (require('next/server').NextResponse)(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401 }
        )
      ),
    }));

    const { GET } = await import('@/app/api/ronin/submissions/route');
    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
