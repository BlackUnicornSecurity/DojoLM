/**
 * File: read-fixture/__tests__/route.test.ts
 * Purpose: Tests for GET /api/read-fixture
 * Source: src/app/api/read-fixture/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockReadFile = vi.fn().mockResolvedValue(Buffer.from('test content'));
const mockStat = vi.fn().mockResolvedValue({ isFile: () => true, size: 100 });

vi.mock('fs/promises', () => {
  const fsPromises = {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    stat: (...args: unknown[]) => mockStat(...args),
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
    readFileSync: vi.fn().mockReturnValue('{}'),
  };
  return { ...fsSync, default: fsSync };
});

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/read-fixture');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/read-fixture', () => {
  it('RF-001: missing path returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('path');
  });

  it('RF-002: invalid path format returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'justfilename' }));
    expect(res.status).toBe(400);
  });

  it('RF-003: invalid category returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'INVALID_CAT/test.txt' }));
    expect(res.status).toBe(400);
  });

  it('RF-004: path traversal attempt blocked', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'prompt-injection/../../../etc/passwd' }));
    expect(res.status).toBe(400);
  });

  it('RF-005: valid path returns content', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'prompt-injection/test.txt' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.content).toBeDefined();
    expect(json.binary).toBe(false);
  });

  it('RF-006: too many path segments returns 400', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'cat/sub/file.txt' }));
    expect(res.status).toBe(400);
  });

  it('RF-007: filename with special chars blocked', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'prompt-injection/file name.txt' }));
    expect(res.status).toBe(400);
  });

  it('RF-008: empty filename blocked', async () => {
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'prompt-injection/' }));
    expect(res.status).toBe(400);
  });

  it('RF-009: file not found returns 404', async () => {
    mockStat.mockResolvedValueOnce(null);
    const { GET } = await import('../route');
    const res = await GET(createGetRequest({ path: 'prompt-injection/nonexistent.txt' }));
    expect(res.status).toBe(404);
  });

  it('RF-010: OPTIONS returns Allow header', async () => {
    const { OPTIONS } = await import('../route');
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get('allow')).toContain('GET');
  });
});
