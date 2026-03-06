/**
 * File: scan/route.test.ts
 * Purpose: Tests for POST /api/scan API route
 * Coverage: API-S-001 to API-S-005
 * Source: src/app/api/scan/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the scanner module
vi.mock('@dojolm/scanner', () => ({
  scan: vi.fn().mockReturnValue({
    verdict: 'ALLOW',
    findings: [],
    totalFindings: 0,
    engines: ['enhanced-pi'],
    scanTimeMs: 5,
  }),
}));

// Mock api-auth to bypass auth in tests
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

function createPostRequest(body: unknown, contentType = 'application/json'): NextRequest {
  return new NextRequest('http://localhost:3000/api/scan', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: JSON.stringify(body),
  });
}

describe('POST /api/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // API-S-001: Submit valid scan payload
  it('API-S-001: returns scan results for valid payload', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const req = createPostRequest({ text: 'Hello, this is a test input' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('verdict');
    expect(body).toHaveProperty('findings');
    expect(body).toHaveProperty('engines');
  });

  // API-S-002: Reject empty body
  it('API-S-002: rejects request with empty text', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const req = createPostRequest({ text: '' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('non-empty string');
  });

  // API-S-003: Reject oversized payload (>100KB)
  it('API-S-003: rejects oversized payload', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const largeText = 'A'.repeat(100_001);
    const req = createPostRequest({ text: largeText });
    const res = await POST(req);

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain('too large');
  });

  // API-S-004: Reject non-string text field
  it('API-S-004: rejects non-string text field', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const req = createPostRequest({ text: 12345 });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('non-empty string');
  });

  // API-S-005: Reject invalid JSON body
  it('API-S-005: rejects invalid JSON body', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const req = new NextRequest('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-valid-json{{{',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid JSON');
  });

  // API-S-005b: Reject null JSON body (BUG-035)
  it('API-S-005b: rejects null JSON body', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const req = new NextRequest('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'null',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('JSON object');
  });

  // API-S-006: Reject whitespace-only text
  it('API-S-006: rejects whitespace-only text', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const req = createPostRequest({ text: '   \n\t   ' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('empty or whitespace');
  });

  // API-S-007: Accept valid engines parameter
  it('API-S-007: accepts scan with engines filter', async () => {
    const { scan } = await import('@dojolm/scanner');
    const { POST } = await import('@/app/api/scan/route');

    const req = createPostRequest({ text: 'test input', engines: ['enhanced-pi'] });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(scan).toHaveBeenCalledWith('test input', { engines: ['enhanced-pi'] });
  });

  // API-S-008: Reject invalid engines parameter
  it('API-S-008: rejects invalid engines parameter', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const req = createPostRequest({ text: 'test', engines: 'not-an-array' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('engines');
  });

  // API-S-009: Response includes security headers
  it('API-S-009: response includes X-Content-Type-Options header', async () => {
    const { POST } = await import('@/app/api/scan/route');

    const req = createPostRequest({ text: 'test input' });
    const res = await POST(req);

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
