/**
 * File: admin/settings/__tests__/route.test.ts
 * Purpose: Tests for GET/PATCH /api/admin/settings API routes
 * Source: src/app/api/admin/settings/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// Mock fs module
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockRenameSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    renameSync: mockRenameSync,
    mkdirSync: mockMkdirSync,
  },
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  renameSync: mockRenameSync,
  mkdirSync: mockMkdirSync,
}));

// Mock crypto for deterministic UUIDs
vi.mock('node:crypto', () => ({
  default: {
    randomBytes: () => ({ toString: () => 'deadbeef' }),
  },
  randomBytes: () => ({ toString: () => 'deadbeef' }),
}));

// Mock runtime paths
vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (filename: string) => `/mock/data/${filename}`,
}));

// withAuth passthrough — calls handler directly with admin role check
vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

// --- Helpers ---

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/admin/settings', {
    method: 'GET',
  });
}

function createPatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const DEFAULT_SETTINGS = {
  sessionTtlMinutes: 1440,
  retentionDays: 90,
};

// --- Tests ---

describe('GET /api/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADMSET-001: returns default settings when file does not exist', async () => {
    mockReadFileSync.mockImplementation(() => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    });

    const { GET } = await import('@/app/api/admin/settings/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(DEFAULT_SETTINGS);
  });

  it('ADMSET-002: returns saved settings from file', async () => {
    const savedSettings = {
      sessionTtlMinutes: 60,
      retentionDays: 30,
    };
    mockReadFileSync.mockReturnValue(JSON.stringify(savedSettings));

    const { GET } = await import('@/app/api/admin/settings/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(savedSettings);
  });

  it('ADMSET-003: returns default values for missing fields', async () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ sessionTtlMinutes: 120 }));

    const { GET } = await import('@/app/api/admin/settings/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionTtlMinutes).toBe(120);
    expect(body.retentionDays).toBe(DEFAULT_SETTINGS.retentionDays);
  });

  it('ADMSET-004: includes security headers in response', async () => {
    mockReadFileSync.mockReturnValue(JSON.stringify(DEFAULT_SETTINGS));

    const { GET } = await import('@/app/api/admin/settings/route');
    const res = await GET(createGetRequest());

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('ADMSET-005: returns defaults when file contains invalid JSON', async () => {
    mockReadFileSync.mockReturnValue('not valid json');

    const { GET } = await import('@/app/api/admin/settings/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(DEFAULT_SETTINGS);
  });
});

describe('PATCH /api/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue(JSON.stringify(DEFAULT_SETTINGS));
    mockMkdirSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);
    mockRenameSync.mockReturnValue(undefined);
  });

  it('ADMSET-006: updates sessionTtlMinutes and returns 200', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ sessionTtlMinutes: 60 }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionTtlMinutes).toBe(60);
    expect(body.retentionDays).toBe(DEFAULT_SETTINGS.retentionDays);
    expect(mockWriteFileSync).toHaveBeenCalled();
    expect(mockRenameSync).toHaveBeenCalled();
  });

  it('ADMSET-007: updates retentionDays and returns 200', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ retentionDays: 30 }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.retentionDays).toBe(30);
    expect(body.sessionTtlMinutes).toBe(DEFAULT_SETTINGS.sessionTtlMinutes);
  });

  it('ADMSET-008: updates both fields simultaneously', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({
      sessionTtlMinutes: 120,
      retentionDays: 45,
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionTtlMinutes).toBe(120);
    expect(body.retentionDays).toBe(45);
  });

  it('ADMSET-009: returns 400 for unknown fields', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({
      sessionTtlMinutes: 60,
      unknownField: 'value',
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown fields/i);
    expect(body.error).toMatch(/unknownField/i);
  });

  it('ADMSET-010: returns 400 when sessionTtlMinutes is not an integer', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ sessionTtlMinutes: 60.5 }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/integer/i);
  });

  it('ADMSET-011: returns 400 when sessionTtlMinutes is below 5', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ sessionTtlMinutes: 4 }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/between 5 and 1440/i);
  });

  it('ADMSET-012: returns 400 when sessionTtlMinutes is above 1440', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ sessionTtlMinutes: 1441 }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/between 5 and 1440/i);
  });

  it('ADMSET-013: returns 400 when retentionDays is not an integer', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ retentionDays: 30.5 }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/integer/i);
  });

  it('ADMSET-014: returns 400 when retentionDays is below 1', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ retentionDays: 0 }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/between 1 and 365/i);
  });

  it('ADMSET-015: returns 400 when retentionDays is above 365', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ retentionDays: 366 }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/between 1 and 365/i);
  });

  it('ADMSET-016: returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:42001/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });

    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it('ADMSET-017: returns 400 when body is not an object', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest([]));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/json object/i);
  });

  it('ADMSET-018: performs atomic write with temp file', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    await PATCH(createPatchRequest({ sessionTtlMinutes: 60 }));

    expect(mockMkdirSync).toHaveBeenCalledWith('/mock/data', { recursive: true });
    expect(mockWriteFileSync).toHaveBeenCalled();
    expect(mockRenameSync).toHaveBeenCalled();

    const tmpPath = mockWriteFileSync.mock.calls[0][0] as string;
    expect(tmpPath).toMatch(/\.tmp$/);
    expect(mockRenameSync).toHaveBeenCalledWith(
      expect.stringMatching(/\.tmp$/),
      '/mock/data/admin-settings.json'
    );
  });

  it('ADMSET-019: includes security headers in response', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    const res = await PATCH(createPatchRequest({ sessionTtlMinutes: 60 }));

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('ADMSET-020: accepts boundary values for settings', async () => {
    const { PATCH } = await import('@/app/api/admin/settings/route');
    
    let res = await PATCH(createPatchRequest({ sessionTtlMinutes: 5, retentionDays: 1 }));
    expect(res.status).toBe(200);

    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue(JSON.stringify(DEFAULT_SETTINGS));
    mockMkdirSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);
    mockRenameSync.mockReturnValue(undefined);

    res = await PATCH(createPatchRequest({ sessionTtlMinutes: 1440, retentionDays: 365 }));
    expect(res.status).toBe(200);
  });
});
