/**
 * File: shingan/url/__tests__/route.test.ts
 * Purpose: Tests for POST /api/shingan/url
 * Coverage: SURL-001 through SURL-004
 * Source: src/app/api/shingan/url/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock checkApiAuth to bypass auth
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(undefined),
}));

// Mock bu-tpi/shingan
const mockScanSkill = vi.fn();
const mockComputeTrustScore = vi.fn();
vi.mock('bu-tpi/shingan', () => ({
  scanSkill: (...args: unknown[]) => mockScanSkill(...args),
  computeTrustScore: (...args: unknown[]) => mockComputeTrustScore(...args),
}));

// Mock global fetch for URL fetching
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/shingan/url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/shingan/url', () => {
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockScanSkill.mockReturnValue({
      findings: [],
      verdict: 'PASS',
      scanTimeMs: 15,
    });
    mockComputeTrustScore.mockReturnValue({
      score: 0.88,
      format: 'mcp',
      breakdown: { structure: 0.90, safety: 0.85 },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '100' }),
      text: vi.fn().mockResolvedValue('fetched skill content'),
    });
    const mod = await import('../route');
    POST = mod.POST;
  });

  // SURL-001: Valid GitHub URL returns scan results
  it('SURL-001: returns scan results for valid GitHub URL', async () => {
    const req = createPostRequest({
      url: 'https://raw.githubusercontent.com/user/repo/main/tool.json',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('trustScore');
    expect(body).toHaveProperty('scanResult');
    expect(body).toHaveProperty('fetchedFrom');
    expect(mockScanSkill).toHaveBeenCalledOnce();
    expect(mockComputeTrustScore).toHaveBeenCalledOnce();
  });

  // SURL-002: Missing url returns 400
  it('SURL-002: rejects request without url field', async () => {
    const req = createPostRequest({ path: '/some/path' });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('url is required');
  });

  // SURL-003: Disallowed host returns 400
  it('SURL-003: rejects URL from disallowed host', async () => {
    const req = createPostRequest({
      url: 'https://evil.example.com/malware.json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('host not allowed');
  });

  // SURL-004: Non-HTTPS URL returns 400
  it('SURL-004: rejects non-HTTPS URL', async () => {
    const req = createPostRequest({
      url: 'http://github.com/user/repo/main/tool.json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('HTTPS');
  });
});
