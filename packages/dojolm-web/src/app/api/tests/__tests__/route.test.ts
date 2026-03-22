/**
 * File: route.test.ts
 * Tests: TST-001 to TST-010
 * Coverage: GET/POST/OPTIONS /api/tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCheckApiAuth = vi.fn().mockReturnValue(null);

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

// Mock child_process so spawn is never actually called
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    default: actual,
    spawn: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/tests', {
    method: 'GET',
  });
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonPostRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not-valid-json',
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/tests', () => {
  let GET: typeof import('../route').GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import('../route'));
    mockCheckApiAuth.mockReturnValue(null);
  });

  // TST-001
  it('TST-001: returns available test suites', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBeDefined();
    expect(Array.isArray(body.available)).toBe(true);
    expect(body.available.length).toBeGreaterThan(0);
    expect(body.suites).toBeDefined();
  });

  // TST-002
  it('TST-002: available suites include known test names', async () => {
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.available).toContain('regression');
    expect(body.available).toContain('false-positive');
  });

  // TST-003
  it('TST-003: GET returns auth error when auth fails', async () => {
    const { NextResponse } = require('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });
});

describe('POST /api/tests', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ POST } = await import('../route'));
    mockCheckApiAuth.mockReturnValue(null);
  });

  // TST-004
  it('TST-004: returns 400 for invalid filter', async () => {
    const res = await POST(makePostRequest({ filter: 'nonexistent-suite' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid test name/i);
  });

  // TST-005
  it('TST-005: returns 400 for invalid JSON body', async () => {
    const res = await POST(makeInvalidJsonPostRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/i);
  });

  // TST-006
  it('TST-006: returns auth error when auth fails on POST', async () => {
    const { NextResponse } = require('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(401);
  });

  // TST-007
  it('TST-007: returns 400 for comma-separated invalid filter', async () => {
    const res = await POST(makePostRequest({ filter: 'regression,does-not-exist' }));
    expect(res.status).toBe(400);
  });

  // TST-008
  it('TST-008: accepts valid filter without error', async () => {
    // Note: this will try to spawn, which is mocked. The spawn mock returns undefined
    // so the test execution will fail/error but POST validation passes (no 400).
    // We just verify we don't get a 400 validation error.
    const res = await POST(makePostRequest({ filter: 'regression' }));
    // May be 200 or 500 depending on mocked spawn behavior, but NOT 400
    expect(res.status).not.toBe(400);
  });
});

describe('OPTIONS /api/tests', () => {
  let OPTIONS: typeof import('../route').OPTIONS;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ OPTIONS } = await import('../route'));
  });

  // TST-009
  it('TST-009: returns 200', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(200);
  });

  // TST-010
  it('TST-010: returns Allow header with GET, POST, OPTIONS', async () => {
    const res = await OPTIONS();
    const allow = res.headers.get('Allow');
    expect(allow).toContain('GET');
    expect(allow).toContain('POST');
    expect(allow).toContain('OPTIONS');
  });
});
