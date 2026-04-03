/**
 * File: sengoku/campaigns/[id]/run/__tests__/route.test.ts
 * Purpose: Unit tests for Campaign Run Trigger API
 * Coverage: RUN-001 to RUN-010
 * Source: src/app/api/sengoku/campaigns/[id]/run/route.ts
 *
 * Index:
 * - POST /api/sengoku/campaigns/[id]/run (line 50)
 * - Auth guard (line 130)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

const mockExecuteCampaignRun = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/sengoku-executor', () => ({
  executeCampaignRun: (...args: unknown[]) => mockExecuteCampaignRun(...args),
}));

const STORED_CAMPAIGN = {
  id: 'camp-1',
  name: 'Test Campaign',
  status: 'active',
  selectedSkillIds: ['pi-scan'],
  targetUrl: 'https://api.example.com',
  authConfig: {},
  schedule: null,
  webhookUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

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
  findingsSummary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
};

const mockFsPromises = {
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(() => Promise.resolve(JSON.stringify(STORED_CAMPAIGN))),
  readdir: vi.fn(() => Promise.resolve([] as unknown[])),
};

vi.mock('node:fs', () => ({
  default: { promises: mockFsPromises },
  promises: mockFsPromises,
}));

vi.mock('node:crypto', () => ({
  default: { randomUUID: () => 'test-run-uuid' },
  randomUUID: () => 'test-run-uuid',
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { checkApiAuth } from '@/lib/api-auth';

const mockCheckApiAuth = vi.mocked(checkApiAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// POST /api/sengoku/campaigns/[id]/run
// ---------------------------------------------------------------------------

describe('POST /api/sengoku/campaigns/[id]/run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.rename.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(STORED_CAMPAIGN));
    mockFsPromises.readdir.mockResolvedValue([]);
    mockExecuteCampaignRun.mockResolvedValue(undefined);
  });

  it('RUN-001: creates a new run for valid campaign', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/camp-1/run');
    const res = await POST(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.runId).toBe('test-run-uuid');
    expect(data.status).toBe('running');
  });

  it('RUN-002: returns 400 for invalid campaign ID', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/../evil/run');
    const res = await POST(req, { params: Promise.resolve({ id: '../evil' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid campaign ID/i);
  });

  it('RUN-003: returns 400 for archived campaign', async () => {
    mockFsPromises.readFile.mockResolvedValue(
      JSON.stringify({ ...STORED_CAMPAIGN, status: 'archived' }),
    );

    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/camp-1/run');
    const res = await POST(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/archived/i);
  });

  it('RUN-004: returns 409 when run already in progress', async () => {
    mockFsPromises.readdir.mockResolvedValue(['run-1.json']);
    mockFsPromises.readFile
      .mockResolvedValueOnce(JSON.stringify(STORED_CAMPAIGN)) // campaign
      .mockResolvedValueOnce(JSON.stringify(RUNNING_RUN));      // existing run

    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/camp-1/run');
    const res = await POST(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already in progress/i);
    expect(data.runId).toBe('run-1');
  });

  it('RUN-005: returns 404 when campaign not found', async () => {
    mockFsPromises.readFile.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/missing-camp/run');
    const res = await POST(req, { params: Promise.resolve({ id: 'missing-camp' }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/Campaign not found/i);
  });

  it('RUN-006: allows new run when existing run is completed', async () => {
    mockFsPromises.readdir.mockResolvedValue(['run-2.json']);
    mockFsPromises.readFile
      .mockResolvedValueOnce(JSON.stringify(STORED_CAMPAIGN)) // campaign
      .mockResolvedValueOnce(JSON.stringify(COMPLETED_RUN));    // completed run

    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/camp-1/run');
    const res = await POST(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.runId).toBe('test-run-uuid');
  });

  it('RUN-007: creates run file with correct structure', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/camp-1/run');
    await POST(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(mockFsPromises.writeFile).toHaveBeenCalled();
    const writeCall = mockFsPromises.writeFile.mock.calls[0];
    const savedRun = JSON.parse(writeCall[1] as string);
    
    expect(savedRun.id).toBe('test-run-uuid');
    expect(savedRun.campaignId).toBe('camp-1');
    expect(savedRun.status).toBe('running');
    expect(savedRun.startedAt).toBeTruthy();
    expect(savedRun.endedAt).toBeNull();
    expect(savedRun.skillResults).toEqual([]);
    expect(savedRun.findingsSummary).toEqual({
      total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0,
    });
  });

  it('RUN-008: handles missing runs directory (first run)', async () => {
    mockFsPromises.readdir.mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );

    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/camp-1/run');
    const res = await POST(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(202);
    expect(mockFsPromises.mkdir).toHaveBeenCalled();
  });

  it('RUN-009: ignores non-JSON files in runs directory', async () => {
    mockFsPromises.readdir.mockResolvedValue(['.DS_Store', 'README.md', 'run-1.json']);
    mockFsPromises.readFile
      .mockResolvedValueOnce(JSON.stringify(STORED_CAMPAIGN))
      .mockResolvedValueOnce(JSON.stringify(RUNNING_RUN));

    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/camp-1/run');
    const res = await POST(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('Auth guard on POST /api/sengoku/campaigns/[id]/run', () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse as never);
  });

  it('RUN-010: returns 401 when auth fails', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns/camp-1/run');
    const res = await POST(req, { params: Promise.resolve({ id: 'camp-1' }) });
    
    expect(res.status).toBe(401);
  });
});
