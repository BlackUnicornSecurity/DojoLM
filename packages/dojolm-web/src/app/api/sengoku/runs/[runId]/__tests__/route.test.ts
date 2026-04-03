/**
 * File: sengoku/runs/[runId]/__tests__/route.test.ts
 * Purpose: Unit tests for Get Run Status with Progress API
 * Coverage: RUNP-001 to RUNP-012
 * Source: src/app/api/sengoku/runs/[runId]/route.ts
 *
 * Index:
 * - GET /api/sengoku/runs/[runId] (line 55)
 * - Auth guard via createApiHandler (line 110)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

const mockCheckApiAuth = vi.fn((..._args: unknown[]) => null as Response | null);

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => (mockCheckApiAuth as (...a: unknown[]) => unknown)(...args),
}));

const RUNNING_RUN = {
  id: 'run-1',
  campaignId: 'camp-1',
  startedAt: '2024-01-01T00:00:00Z',
  endedAt: null,
  status: 'running',
  skillResults: [
    { skillId: 'pi-scan', status: 'success', findings: [], startedAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-01T00:01:00Z' },
    { skillId: 'pi-boundary', status: 'running', findings: [], startedAt: '2024-01-01T00:01:00Z', completedAt: '' },
  ],
  findingsSummary: { total: 2, critical: 0, high: 1, medium: 1, low: 0, info: 0 },
};

const COMPLETED_RUN = {
  id: 'run-2',
  campaignId: 'camp-1',
  startedAt: '2024-01-01T00:00:00Z',
  endedAt: '2024-01-01T01:00:00Z',
  status: 'completed',
  skillResults: [
    { skillId: 'pi-scan', status: 'success', findings: [], startedAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-01T00:01:00Z' },
    { skillId: 'pi-boundary', status: 'success', findings: [], startedAt: '2024-01-01T00:01:00Z', completedAt: '2024-01-01T00:02:00Z' },
  ],
  findingsSummary: { total: 5, critical: 0, high: 1, medium: 2, low: 2, info: 0 },
};

const FAILED_RUN = {
  id: 'run-3',
  campaignId: 'camp-1',
  startedAt: '2024-01-01T00:00:00Z',
  endedAt: '2024-01-01T00:30:00Z',
  status: 'failed',
  skillResults: [
    { skillId: 'pi-scan', status: 'error', findings: [], startedAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-01T00:01:00Z' },
  ],
  findingsSummary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
};

const mockFsPromises = {
  access: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(() => Promise.resolve(JSON.stringify(RUNNING_RUN))),
  readdir: vi.fn(() => Promise.resolve([] as unknown[])),
};

vi.mock('node:fs/promises', () => ({
  default: mockFsPromises,
  ...mockFsPromises,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), { method: 'GET' });
}

// ---------------------------------------------------------------------------
// GET /api/sengoku/runs/[runId]
// ---------------------------------------------------------------------------

describe('GET /api/sengoku/runs/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.access.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(RUNNING_RUN));
    mockFsPromises.readdir.mockResolvedValue([]);
  });

  it('RUNP-001: returns run with progress', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.run).toBeDefined();
    expect(data.run.id).toBe('run-1');
    expect(data.run.campaignId).toBe('camp-1');
    expect(data.run.status).toBe('running');
    expect(typeof data.run.progress).toBe('number');
  });

  it('RUNP-002: calculates progress correctly for running run', async () => {
    // 1 completed out of 2 skills = 50%
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    const data = await res.json();
    expect(data.run.progress).toBe(50);
  });

  it('RUNP-003: returns 100% progress for completed run', async () => {
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(COMPLETED_RUN));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-2');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-2' }) });

    const data = await res.json();
    expect(data.run.progress).toBe(100);
  });

  it('RUNP-004: returns 400 for invalid run ID', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/../evil');
    const res = await GET(req, { params: Promise.resolve({ runId: '../evil' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid run id/i);
  });

  it('RUNP-005: returns 404 when run not found', async () => {
    mockFsPromises.access.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    mockFsPromises.readdir.mockResolvedValue([]);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/missing-run');
    const res = await GET(req, { params: Promise.resolve({ runId: 'missing-run' }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/Run not found/i);
  });

  it('RUNP-006: handles flat run file path', async () => {
    // First access (flat path) succeeds
    mockFsPromises.access.mockResolvedValue(undefined);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    expect(res.status).toBe(200);
    expect(mockFsPromises.readdir).not.toHaveBeenCalled();
  });

  it('RUNP-007: handles nested run file path (campaign subdir)', async () => {
    // Flat path fails, need to search subdirs
    mockFsPromises.access.mockRejectedValueOnce(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    
    const mockDirent = {
      name: 'camp-1',
      isDirectory: () => true,
    };
    mockFsPromises.readdir.mockResolvedValue([mockDirent]);
    // Second access for subdir path succeeds
    mockFsPromises.access.mockResolvedValueOnce(undefined);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    expect(res.status).toBe(200);
    expect(mockFsPromises.readdir).toHaveBeenCalled();
  });

  it('RUNP-008: calculates progress for failed run', async () => {
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(FAILED_RUN));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-3');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-3' }) });

    const data = await res.json();
    expect(data.run.status).toBe('failed');
    expect(data.run.progress).toBe(100); // 1 completed / 1 total
  });

  it('RUNP-009: returns current skill for running run', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    const data = await res.json();
    expect(data.run.currentSkill).toBe('pi-boundary');
  });

  it('RUNP-010: returns null current skill when all skills completed', async () => {
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(COMPLETED_RUN));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-2');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-2' }) });

    const data = await res.json();
    expect(data.run.currentSkill).toBeNull();
  });

  it('RUNP-011: returns findings count', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    const data = await res.json();
    expect(data.run.findingsCount).toBe(2);
  });

  it('RUNP-012: returns 404 when run file is corrupt', async () => {
    mockFsPromises.readFile.mockResolvedValue('invalid json');

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/Run not found/i);
  });

  it('handles empty run file directory', async () => {
    mockFsPromises.access.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    mockFsPromises.readdir.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/missing-run');
    const res = await GET(req, { params: Promise.resolve({ runId: 'missing-run' }) });

    expect(res.status).toBe(404);
  });

  it('skips non-directory entries when searching nested paths', async () => {
    mockFsPromises.access.mockRejectedValueOnce(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    
    const fileDirent = { name: 'some-file.txt', isDirectory: () => false };
    const dirDirent = { name: 'camp-1', isDirectory: () => true };
    mockFsPromises.readdir.mockResolvedValue([fileDirent, dirDirent]);
    mockFsPromises.access.mockRejectedValueOnce(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    expect(res.status).toBe(404);
  });

  it('skips directories with invalid names when searching', async () => {
    mockFsPromises.access.mockRejectedValueOnce(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    
    const invalidDirent = { name: '../evil', isDirectory: () => true };
    mockFsPromises.readdir.mockResolvedValue([invalidDirent]);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Auth guard via createApiHandler
// ---------------------------------------------------------------------------

describe('Auth guard via createApiHandler', () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Authentication required' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse);
    // Set NODA_API_KEY to trigger auth check
    process.env.NODA_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.NODA_API_KEY;
  });

  it('returns 401 when auth fails via createApiHandler', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });
    
    expect(res.status).toBe(401);
  });
});
