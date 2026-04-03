/**
 * File: sengoku/campaigns/[id]/runs/__tests__/route.test.ts
 * Purpose: Unit tests for List Campaign Runs API
 * Coverage: RUNS-001 to RUNS-008
 * Source: src/app/api/sengoku/campaigns/[id]/runs/route.ts
 *
 * Index:
 * - GET /api/sengoku/campaigns/[id]/runs (line 45)
 * - Auth guard (line 100)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

const MOCK_RUN_1 = {
  id: 'run-1',
  campaignId: 'camp-1',
  startedAt: '2024-01-02T00:00:00Z',
  endedAt: '2024-01-02T01:00:00Z',
  status: 'completed',
  skillResults: [],
  findingsSummary: { total: 5, critical: 0, high: 1, medium: 2, low: 2, info: 0 },
};

const MOCK_RUN_2 = {
  id: 'run-2',
  campaignId: 'camp-1',
  startedAt: '2024-01-01T00:00:00Z',
  endedAt: null,
  status: 'running',
  skillResults: [],
  findingsSummary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
};

const mockFsPromises = {
  readdir: vi.fn(() => Promise.resolve([] as unknown[])),
  readFile: vi.fn(() => Promise.resolve('{}')),
};

vi.mock('node:fs', () => ({
  default: { promises: mockFsPromises },
  promises: mockFsPromises,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { checkApiAuth } from '@/lib/api-auth';

const mockCheckApiAuth = vi.mocked(checkApiAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), { method: 'GET' });
}

// ---------------------------------------------------------------------------
// GET /api/sengoku/campaigns/[id]/runs
// ---------------------------------------------------------------------------

describe('GET /api/sengoku/campaigns/[id]/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.readdir.mockResolvedValue([]);
    mockFsPromises.readFile.mockResolvedValue('{}');
  });

  it('RUNS-001: returns list of runs', async () => {
    mockFsPromises.readdir.mockResolvedValue(['run-1.json', 'run-2.json']);
    mockFsPromises.readFile
      .mockResolvedValueOnce(JSON.stringify(MOCK_RUN_1))
      .mockResolvedValueOnce(JSON.stringify(MOCK_RUN_2));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs).toHaveLength(2);
    expect(data.runs[0].id).toBe('run-1'); // sorted by startedAt desc
    expect(data.runs[1].id).toBe('run-2');
  });

  it('RUNS-002: returns empty array when no runs', async () => {
    mockFsPromises.readdir.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs).toEqual([]);
  });

  it('RUNS-003: returns 400 for invalid campaign ID', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/../evil/runs');
    const res = await GET(req, { params: Promise.resolve({ id: '../evil' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid campaign ID/i);
  });

  it('RUNS-004: handles corrupt run files gracefully', async () => {
    mockFsPromises.readdir.mockResolvedValue(['run-1.json', 'corrupt.json', 'run-2.json']);
    mockFsPromises.readFile
      .mockResolvedValueOnce(JSON.stringify(MOCK_RUN_1))
      .mockRejectedValueOnce(new Error('Invalid JSON')) // corrupt file
      .mockResolvedValueOnce(JSON.stringify(MOCK_RUN_2));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs).toHaveLength(2);
    expect(data.runs.map((r: { id: string }) => r.id)).toContain('run-1');
    expect(data.runs.map((r: { id: string }) => r.id)).toContain('run-2');
  });

  it('RUNS-005: ignores non-JSON files', async () => {
    mockFsPromises.readdir.mockResolvedValue(['run-1.json', '.DS_Store', 'README.md', 'data.txt']);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(MOCK_RUN_1));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0].id).toBe('run-1');
  });

  it('RUNS-006: sorts runs by startedAt descending', async () => {
    const run1 = { ...MOCK_RUN_1, startedAt: '2024-01-01T00:00:00Z' };
    const run2 = { ...MOCK_RUN_2, startedAt: '2024-01-03T00:00:00Z' };
    const run3 = { ...MOCK_RUN_1, id: 'run-3', startedAt: '2024-01-02T00:00:00Z' };

    mockFsPromises.readdir.mockResolvedValue(['run-1.json', 'run-2.json', 'run-3.json']);
    mockFsPromises.readFile
      .mockResolvedValueOnce(JSON.stringify(run1))
      .mockResolvedValueOnce(JSON.stringify(run2))
      .mockResolvedValueOnce(JSON.stringify(run3));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs[0].id).toBe('run-2'); // newest first
    expect(data.runs[1].id).toBe('run-3');
    expect(data.runs[2].id).toBe('run-1'); // oldest last
  });

  it('RUNS-007: handles runs with missing startedAt', async () => {
    const runWithoutDate = { ...MOCK_RUN_1, startedAt: undefined };
    mockFsPromises.readdir.mockResolvedValue(['run-1.json']);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(runWithoutDate));

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs).toHaveLength(1);
  });

  it('RUNS-008: handles empty runs directory', async () => {
    mockFsPromises.readdir.mockResolvedValue([]);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('Auth guard on GET /api/sengoku/campaigns/[id]/runs', () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse as never);
  });

  it('returns 401 when auth fails', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });
    
    expect(res.status).toBe(401);
  });
});
