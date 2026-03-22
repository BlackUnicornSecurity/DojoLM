/**
 * File: read-fixture/media/__tests__/route.test.ts
 * Purpose: Tests for GET /api/read-fixture/media
 * Source: src/app/api/read-fixture/media/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockMediaStat = vi.fn().mockResolvedValue({ isFile: () => true, size: 1024 });

vi.mock('fs/promises', () => {
  const fsPromises = {
    readFile: vi.fn().mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47])), // PNG magic
    stat: (...args: unknown[]) => mockMediaStat(...args),
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
  const url = new URL('http://localhost:42001/api/read-fixture/media');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/read-fixture/media', () => {
  it('MED-001: missing path returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(400);
  });

  it('MED-002: invalid path format returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'onlyone' }));
    expect(res.status).toBe(400);
  });

  it('MED-003: invalid category returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'BADCAT/test.png' }));
    expect(res.status).toBe(400);
  });

  it('MED-004: path traversal blocked', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'images/../../../etc/shadow' }));
    expect(res.status).toBe(400);
  });

  it('MED-005: valid image path returns binary content', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'images/test.png' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('MED-006: SVG blocked (XSS vector)', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'images/test.svg' }));
    expect(res.status).toBe(403);
  });

  it('MED-007: has security headers', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'images/test.png' }));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toBeDefined();
  });

  it('MED-008: file not found returns 404', async () => {
    mockMediaStat.mockResolvedValueOnce(null);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'images/missing.png' }));
    expect(res.status).toBe(404);
  });

  it('MED-009: has cache-control header', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'images/test.png' }));
    expect(res.headers.get('cache-control')).toContain('max-age');
  });

  it('MED-010: OPTIONS returns Allow header', async () => {
    const { OPTIONS } = await import('../route');
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get('allow')).toContain('GET');
  });
});
