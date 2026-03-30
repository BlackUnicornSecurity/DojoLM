/**
 * File: sengoku/campaigns/[id]/runs/[runId]/__tests__/route.test.ts
 * Purpose: Unit tests for Single Run Detail and Cancel API
 * Coverage: RUN-011 to RUN-020
 * Source: src/app/api/sengoku/campaigns/[id]/runs/[runId]/route.ts
 *
 * Index:
 * - GET /api/sengoku/campaigns/[id]/runs/[runId] (line 50)
 * - PATCH /api/sengoku/campaigns/[id]/runs/[runId] (line 80)
 * - Auth guard (line 140)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

const RUNNING_RUN = {
  id: 'run-1',
  campaignId: 'camp-1',
  startedAt: '2024-01-01T00:00:00Z',
  endedAt: null,
  status: 'running',
  skillResults: [],
  findingsSummary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
};

const COMPLETED_RUN = {
  id: 'run-2',
  campaignId: 'camp-1',
  startedAt: '2024-01-01T00:00:00Z',
  endedAt: '2024-01-01T01:00:00Z',
  status: 'completed',
  skillResults: [],
  findingsSummary: { total: 5, critical: 0, high: 1, medium: 2, low: 2, info: 0 },
};

const mockFsPromises = {
  readFile: vi.fn(() => Promise.resolve(JSON.stringify(RUNNING_RUN))),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
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

function makePatchRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// GET /api/sengoku/campaigns/[id]/runs/[runId]
// ---------------------------------------------------------------------------

describe('GET /api/sengoku/campaigns/[id]/runs/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(RUNNING_RUN));
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.rename.mockResolvedValue(undefined);
  });

  it('RUN-011: returns run details', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1', runId: 'run-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('run-1');
    expect(data.campaignId).toBe('camp-1');
    expect(data.status).toBe('running');
  });

  it('RUN-012: returns 404 for non-existent run', async () => {
    mockFsPromises.readFile.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs/missing-run');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1', runId: 'missing-run' }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/Run not found/i);
  });

  it('RUN-013: returns 400 for invalid campaign ID', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/../evil/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ id: '../evil', runId: 'run-1' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid ID/i);
  });

  it('RUN-014: returns 400 for invalid run ID', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs/../evil');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1', runId: '../evil' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid ID/i);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/sengoku/campaigns/[id]/runs/[runId]
// ---------------------------------------------------------------------------

describe('PATCH /api/sengoku/campaigns/[id]/runs/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(RUNNING_RUN));
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.rename.mockResolvedValue(undefined);
  });

  it('RUN-015: cancels running campaign', async () => {
    const { PATCH } = await import('../route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1/runs/run-1', {});
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1', runId: 'run-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('cancelled');
    expect(data.endedAt).toBeTruthy();
  });

  it('RUN-016: returns 400 for non-running campaign', async () => {
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(COMPLETED_RUN));

    const { PATCH } = await import('../route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1/runs/run-2', {});
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1', runId: 'run-2' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Can only cancel running campaigns/i);
  });

  it('RUN-017: returns 404 when run not found', async () => {
    mockFsPromises.readFile.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const { PATCH } = await import('../route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1/runs/missing-run', {});
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1', runId: 'missing-run' }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/Run not found/i);
  });

  it('RUN-018: returns 400 for invalid campaign ID', async () => {
    const { PATCH } = await import('../route');
    const req = makePatchRequest('/api/sengoku/campaigns/../evil/runs/run-1', {});
    const res = await PATCH(req, { params: Promise.resolve({ id: '../evil', runId: 'run-1' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid ID/i);
  });

  it('RUN-019: returns 400 for invalid run ID', async () => {
    const { PATCH } = await import('../route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1/runs/../evil', {});
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1', runId: '../evil' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid ID/i);
  });

  it('RUN-020: persists cancelled run to disk atomically', async () => {
    const { PATCH } = await import('../route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1/runs/run-1', {});
    await PATCH(req, { params: Promise.resolve({ id: 'camp-1', runId: 'run-1' }) });

    expect(mockFsPromises.writeFile).toHaveBeenCalled();
    expect(mockFsPromises.rename).toHaveBeenCalled();

    const writeCall = mockFsPromises.writeFile.mock.calls[0];
    const savedRun = JSON.parse(writeCall[1] as string);
    expect(savedRun.status).toBe('cancelled');
    expect(savedRun.endedAt).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('Auth guard on run endpoints', () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse as never);
  });

  it('returns 401 on GET when auth fails', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1/runs/run-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1', runId: 'run-1' }) });
    
    expect(res.status).toBe(401);
  });

  it('returns 401 on PATCH when auth fails', async () => {
    const { PATCH } = await import('../route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1/runs/run-1', {});
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1', runId: 'run-1' }) });
    
    expect(res.status).toBe(401);
  });
});
