/**
 * File: scan-fixture/__tests__/route.test.ts
 * Purpose: Tests for GET/POST /api/scan-fixture
 * Source: src/app/api/scan-fixture/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckApiAuth = vi.fn().mockReturnValue(null);
const mockScan = vi.fn().mockReturnValue({ findings: [], verdict: 'ALLOW' });
const mockScanBinary = vi.fn().mockResolvedValue({ findings: [], verdict: 'ALLOW' });

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

vi.mock('@dojolm/scanner', () => ({
  scan: (...args: unknown[]) => mockScan(...args),
}));

vi.mock('bu-tpi/scanner-binary', () => ({
  scanBinary: (...args: unknown[]) => mockScanBinary(...args),
}));

vi.mock('fs/promises', () => {
  const fsPromises = {
    readFile: vi.fn().mockResolvedValue(Buffer.from('test injection content')),
    stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 100 }),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    access: vi.fn().mockResolvedValue(undefined),
  };
  return { ...fsPromises, default: fsPromises };
});

vi.mock('fs', () => {
  const fsSync = {
    existsSync: vi.fn().mockReturnValue(true),
  };
  return { ...fsSync, default: fsSync };
});

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/scan-fixture');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/scan-fixture', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
  mockScan.mockReturnValue({ findings: [{ severity: 'WARNING' }], verdict: 'BLOCK' });
});

describe('GET /api/scan-fixture', () => {
  it('SF-001: missing path returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(400);
  });

  it('SF-002: invalid path format returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'just-one-segment' }));
    expect(res.status).toBe(400);
  });

  it('SF-003: invalid category returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'INVALID/test.txt' }));
    expect(res.status).toBe(400);
  });

  it('SF-004: path traversal blocked', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'prompt-injection/../../../etc/passwd' }));
    expect(res.status).toBe(400);
  });

  it('SF-005: valid path returns scan result', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'prompt-injection/test.txt' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result).toBeDefined();
    expect(json.skipped).toBe(false);
  });

  it('SF-006: auth failure', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'prompt-injection/test.txt' }));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/scan-fixture', () => {
  it('SF-007: POST with valid body scans', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({ path: 'prompt-injection/test.txt' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result).toBeDefined();
  });

  it('SF-008: POST missing path returns 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(createPostRequest({}));
    expect(res.status).toBe(400);
  });

  it('SF-009: POST invalid JSON returns 400', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:3000/api/scan-fixture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('SF-010: OPTIONS returns Allow header', async () => {
    const { OPTIONS } = await import('../route');
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get('allow')).toContain('GET');
    expect(res.headers.get('allow')).toContain('POST');
  });
});
