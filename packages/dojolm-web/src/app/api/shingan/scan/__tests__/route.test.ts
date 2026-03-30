/**
 * File: shingan/scan/__tests__/route.test.ts
 * Purpose: Tests for POST /api/shingan/scan
 * Coverage: SSCAN-001 through SSCAN-004
 * Source: src/app/api/shingan/scan/route.ts
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

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/shingan/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/shingan/scan', () => {
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockScanSkill.mockReturnValue({
      findings: [],
      verdict: 'PASS',
      scanTimeMs: 12,
    });
    mockComputeTrustScore.mockReturnValue({
      score: 0.91,
      format: 'mcp',
      breakdown: { structure: 0.95, safety: 0.88 },
    });
    const mod = await import('../route');
    POST = mod.POST;
  });

  // SSCAN-001: Valid scan returns trust score and scan result
  it('SSCAN-001: returns scan results for valid content', async () => {
    const req = createPostRequest({
      content: 'function hello() { return "world"; }',
      filename: 'tool.js',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('trustScore');
    expect(body).toHaveProperty('scanResult');
    expect(body).toHaveProperty('detectedFormat');
    expect(mockScanSkill).toHaveBeenCalledOnce();
    expect(mockComputeTrustScore).toHaveBeenCalledOnce();
  });

  // SSCAN-002: Missing content returns 400
  it('SSCAN-002: rejects request without content', async () => {
    const req = createPostRequest({ filename: 'tool.js' });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Content is required');
  });

  // SSCAN-003: Oversized content returns 400
  it('SSCAN-003: rejects content exceeding max size', async () => {
    const oversized = 'X'.repeat(512_001);
    const req = createPostRequest({ content: oversized });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('maximum size');
  });

  // SSCAN-004: Internal error returns 500
  it('SSCAN-004: returns 500 on internal error', async () => {
    mockScanSkill.mockImplementation(() => {
      throw new Error('Engine crash');
    });

    const req = createPostRequest({ content: 'valid content' });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Scan failed');
  });
});
