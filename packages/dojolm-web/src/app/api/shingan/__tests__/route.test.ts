/**
 * File: shingan/__tests__/route.test.ts
 * Purpose: Integration tests for Shingan scan API routes
 *
 * Routes under test:
 * - POST /api/shingan/scan   — single skill scan (D7.11)
 * - POST /api/shingan/batch  — batch skill scan (D7.11)
 * - POST /api/shingan/url    — URL-based scan (D7.11)
 *
 * Index:
 * POST /api/shingan/scan
 * - SCAN-001: valid content returns 200 with trustScore (line ~120)
 * - SCAN-002: missing content returns 400 (line ~135)
 * - SCAN-003: unauthenticated request returns 401 (line ~147)
 * - SCAN-004: oversized content returns 400 (line ~160)
 *
 * POST /api/shingan/batch
 * - BATCH-001: valid skills array returns 200 with results array (line ~175)
 * - BATCH-002: missing skills field returns 400 (line ~192)
 * - BATCH-003: empty skills array returns 400 (line ~205)
 * - BATCH-004: unauthenticated request returns 401 (line ~217)
 *
 * POST /api/shingan/url
 * - URL-001: invalid URL format returns 400 (line ~232)
 * - URL-002: disallowed host returns 400 (line ~247)
 * - URL-003: missing url field returns 400 (line ~261)
 * - URL-004: unauthenticated request returns 401 (line ~274)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Module-level mocks — must be hoisted before route imports
// ---------------------------------------------------------------------------

const mockCheckApiAuth = vi.fn(() => null as NextResponse | null);

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args as [NextRequest]),
}));

// Minimal trust score shape returned by the mock
const MOCK_TRUST_SCORE = {
  overall: 92,
  layers: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0 },
  riskLevel: 'safe' as const,
  findings: [],
  format: 'unknown' as const,
  parsedMetadata: {},
};

const MOCK_SCAN_RESULT = {
  findings: [],
  meta: { engine: 'shingan-scanner', duration_ms: 1 },
};

const mockScanSkill = vi.fn(() => MOCK_SCAN_RESULT);
const mockComputeTrustScore = vi.fn(() => MOCK_TRUST_SCORE);
const mockBatchTrustScore = vi.fn((skills: unknown[]) =>
  (Array.isArray(skills) ? skills : []).map(() => MOCK_TRUST_SCORE)
);

vi.mock('bu-tpi/shingan', () => ({
  scanSkill: (...args: unknown[]) => mockScanSkill(...args),
  computeTrustScore: (...args: unknown[]) => mockComputeTrustScore(...args),
  batchTrustScore: (skills: unknown) => mockBatchTrustScore(skills as unknown[]),
}));

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function postJson(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// POST /api/shingan/scan
// ---------------------------------------------------------------------------

describe('POST /api/shingan/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockScanSkill.mockReturnValue(MOCK_SCAN_RESULT);
    mockComputeTrustScore.mockReturnValue(MOCK_TRUST_SCORE);
  });

  it('SCAN-001: returns 200 with trustScore and scanResult for valid content', async () => {
    const { POST } = await import('@/app/api/shingan/scan/route');

    const req = postJson('/api/shingan/scan', { content: '# My Skill\n\nThis is a safe skill.' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('trustScore');
    expect(body).toHaveProperty('scanResult');
    expect(body.trustScore).toHaveProperty('overall');
    expect(body.trustScore.overall).toBe(92);
  });

  it('SCAN-002: returns 400 when content field is missing', async () => {
    const { POST } = await import('@/app/api/shingan/scan/route');

    const req = postJson('/api/shingan/scan', { filename: 'test.md' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('SCAN-003: returns 401 when auth check fails', async () => {
    const { POST } = await import('@/app/api/shingan/scan/route');

    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const req = postJson('/api/shingan/scan', { content: '# Skill' });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('SCAN-004: returns 400 when content exceeds maximum size', async () => {
    const { POST } = await import('@/app/api/shingan/scan/route');

    const oversized = 'x'.repeat(513_000);
    const req = postJson('/api/shingan/scan', { content: oversized });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/size|large/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/shingan/batch
// ---------------------------------------------------------------------------

describe('POST /api/shingan/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockBatchTrustScore.mockImplementation((skills: unknown[]) =>
      (Array.isArray(skills) ? skills : []).map(() => MOCK_TRUST_SCORE)
    );
  });

  it('BATCH-001: returns 200 with results array for a valid skills payload', async () => {
    const { POST } = await import('@/app/api/shingan/batch/route');

    const req = postJson('/api/shingan/batch', {
      skills: [
        { content: '# Skill One\n\nDoes something.' },
        { content: '# Skill Two\n\nDoes another thing.' },
      ],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results).toHaveLength(2);
  });

  it('BATCH-002: returns 400 when skills field is missing', async () => {
    const { POST } = await import('@/app/api/shingan/batch/route');

    const req = postJson('/api/shingan/batch', { data: [] });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/skills/i);
  });

  it('BATCH-003: returns 400 for an empty skills array', async () => {
    const { POST } = await import('@/app/api/shingan/batch/route');

    const req = postJson('/api/shingan/batch', { skills: [] });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('BATCH-004: returns 401 when auth check fails', async () => {
    const { POST } = await import('@/app/api/shingan/batch/route');

    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const req = postJson('/api/shingan/batch', {
      skills: [{ content: '# Skill' }],
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/shingan/url
// ---------------------------------------------------------------------------

describe('POST /api/shingan/url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
  });

  it('URL-001: returns 400 for a malformed URL string', async () => {
    const { POST } = await import('@/app/api/shingan/url/route');

    const req = postJson('/api/shingan/url', { url: 'not-a-valid-url' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/url|invalid/i);
  });

  it('URL-002: returns 400 for a URL with a disallowed host', async () => {
    const { POST } = await import('@/app/api/shingan/url/route');

    const req = postJson('/api/shingan/url', { url: 'https://evil.com/malicious-skill.md' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/host|allowed/i);
  });

  it('URL-003: returns 400 when url field is missing', async () => {
    const { POST } = await import('@/app/api/shingan/url/route');

    const req = postJson('/api/shingan/url', { filename: 'test.md' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('URL-004: returns 401 when auth check fails', async () => {
    const { POST } = await import('@/app/api/shingan/url/route');

    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const req = postJson('/api/shingan/url', {
      url: 'https://raw.githubusercontent.com/user/repo/main/skill.md',
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('URL-005: returns 400 for an HTTP (non-HTTPS) allowed-host URL', async () => {
    const { POST } = await import('@/app/api/shingan/url/route');

    const req = postJson('/api/shingan/url', {
      url: 'http://raw.githubusercontent.com/user/repo/main/skill.md',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/https/i);
  });
});
