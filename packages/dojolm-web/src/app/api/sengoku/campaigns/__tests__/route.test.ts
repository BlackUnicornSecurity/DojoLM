/**
 * File: sengoku/campaigns/__tests__/route.test.ts
 * Purpose: Integration tests for Campaign CRUD API routes
 * Coverage: CAMP-001 to CAMP-030
 * Source:
 *   src/app/api/sengoku/campaigns/route.ts
 *   src/app/api/sengoku/campaigns/[id]/route.ts
 *
 * Index:
 * - POST /api/sengoku/campaigns (line 100)
 * - GET  /api/sengoku/campaigns (line 210)
 * - GET  /api/sengoku/campaigns/[id] (line 280)
 * - PATCH /api/sengoku/campaigns/[id] (line 360)
 * - DELETE /api/sengoku/campaigns/[id] (line 440)
 * - Auth guard — all endpoints (line 510)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

const STORED_CAMPAIGN = {
  id: 'camp-1',
  name: 'Test',
  status: 'active',
  selectedSkillIds: ['pi-scan'],
  targetUrl: 'https://api.example.com',
  authConfig: {},
  schedule: null,
  webhookUrl: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockFsPromises = {
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(() => Promise.resolve(JSON.stringify(STORED_CAMPAIGN))),
  readdir: vi.fn(() => Promise.resolve(['camp-1.json'])),
  stat: vi.fn(() => Promise.resolve({ isFile: () => true })),
  unlink: vi.fn().mockResolvedValue(undefined),
};

vi.mock('node:fs', () => ({
  default: { promises: mockFsPromises },
  promises: mockFsPromises,
}));

vi.mock('node:crypto', () => ({
  default: { randomUUID: () => 'test-uuid' },
  randomUUID: () => 'test-uuid',
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { checkApiAuth } from '@/lib/api-auth';

const mockCheckApiAuth = vi.mocked(checkApiAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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

function makeDeleteRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), { method: 'DELETE' });
}

const VALID_CAMPAIGN_BODY = {
  name: 'My Campaign',
  targetUrl: 'https://api.example.com/v1/chat',
  selectedSkillIds: ['pi-scan'],
};

// ---------------------------------------------------------------------------
// POST /api/sengoku/campaigns
// ---------------------------------------------------------------------------

describe('POST /api/sengoku/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.rename.mockResolvedValue(undefined);
  });

  it('CAMP-001: creates campaign with valid body and returns 201', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', VALID_CAMPAIGN_BODY);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    expect(data.name).toBe('My Campaign');
    expect(data.status).toBe('draft');
    expect(data.targetUrl).toBe('https://api.example.com/v1/chat');
    expect(data.selectedSkillIds).toContain('pi-scan');
  });

  it('CAMP-002: returns 400 for missing name', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', {
      targetUrl: 'https://api.example.com',
      selectedSkillIds: ['pi-scan'],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name/i);
  });

  it('CAMP-003: returns 400 for name with unsafe characters', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', {
      name: '<script>alert(1)</script>',
      targetUrl: 'https://api.example.com',
      selectedSkillIds: ['pi-scan'],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('CAMP-004: returns 400 for missing targetUrl', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', {
      name: 'Valid Name',
      selectedSkillIds: ['pi-scan'],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/targetUrl/i);
  });

  it('CAMP-005: returns 400 for invalid targetUrl (not a URL)', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', {
      name: 'Valid Name',
      targetUrl: 'not-a-url',
      selectedSkillIds: ['pi-scan'],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('CAMP-006: returns 400 when selectedSkillIds is empty', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', {
      name: 'Valid Name',
      targetUrl: 'https://api.example.com',
      selectedSkillIds: [],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/skill/i);
  });

  it('CAMP-007: returns 400 when selectedSkillIds exceeds 100 entries', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', {
      name: 'Valid Name',
      targetUrl: 'https://api.example.com',
      selectedSkillIds: Array.from({ length: 101 }, (_, i) => `skill-${i}`),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/100/);
  });

  it('CAMP-008: accepts optional graph, schedule, and webhookUrl fields', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', {
      ...VALID_CAMPAIGN_BODY,
      schedule: '0 9 * * *',
      webhookUrl: 'https://hooks.example.com/notify',
      graph: {
        nodes: [{ skillId: 'pi-scan', order: 1, onPass: null, onFail: null, onCriticalFinding: [] }],
        entryNodeId: 'pi-scan',
        description: 'Simple graph',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.schedule).toBe('0 9 * * *');
    expect(data.webhookUrl).toBe('https://hooks.example.com/notify');
    expect(data.graph).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GET /api/sengoku/campaigns
// ---------------------------------------------------------------------------

describe('GET /api/sengoku/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.readdir.mockResolvedValue(['camp-1.json'] as never);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(STORED_CAMPAIGN) as never);
  });

  it('CAMP-009: returns 200 with campaigns array', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('campaigns');
    expect(Array.isArray(data.campaigns)).toBe(true);
  });

  it('CAMP-010: excludes archived campaigns from listing', async () => {
    mockFsPromises.readFile.mockResolvedValue(
      JSON.stringify({ ...STORED_CAMPAIGN, status: 'archived' }) as never,
    );

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.campaigns).toHaveLength(0);
  });

  it('CAMP-011: returns empty array when no campaign files exist', async () => {
    mockFsPromises.readdir.mockResolvedValue([] as never);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.campaigns).toHaveLength(0);
  });

  it('CAMP-012: ignores non-json files in campaigns directory', async () => {
    mockFsPromises.readdir.mockResolvedValue(['camp-1.json', 'README.md', '.DS_Store'] as never);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(STORED_CAMPAIGN) as never);

    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    // Only camp-1.json matches .json filter
    expect(data.campaigns).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/sengoku/campaigns/[id]
// ---------------------------------------------------------------------------

describe('GET /api/sengoku/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(STORED_CAMPAIGN) as never);
    mockFsPromises.readdir.mockResolvedValue([] as never);
  });

  it('CAMP-013: returns 200 with campaign and runs', async () => {
    const { GET } = await import('../[id]/route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.campaign).toBeDefined();
    expect(data.campaign.id).toBe('camp-1');
    expect(Array.isArray(data.runs)).toBe(true);
  });

  it('CAMP-014: returns 404 when campaign does not exist', async () => {
    mockFsPromises.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) as never);

    const { GET } = await import('../[id]/route');
    const req = makeGetRequest('/api/sengoku/campaigns/missing-id');
    const res = await GET(req, { params: Promise.resolve({ id: 'missing-id' }) });

    expect(res.status).toBe(404);
  });

  it('CAMP-015: returns 400 for invalid campaign ID containing path traversal', async () => {
    const { GET } = await import('../[id]/route');
    const req = makeGetRequest('/api/sengoku/campaigns/../evil');
    const res = await GET(req, { params: Promise.resolve({ id: '../evil' }) });

    expect(res.status).toBe(400);
  });

  it('CAMP-016: includes run history when runs directory has files', async () => {
    const mockRun = { id: 'run-1', campaignId: 'camp-1', status: 'completed' };
    mockFsPromises.readdir.mockResolvedValue(['run-1.json'] as never);
    mockFsPromises.readFile
      .mockResolvedValueOnce(JSON.stringify(STORED_CAMPAIGN) as never) // campaign
      .mockResolvedValueOnce(JSON.stringify(mockRun) as never);          // run

    const { GET } = await import('../[id]/route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0].id).toBe('run-1');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/sengoku/campaigns/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/sengoku/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(STORED_CAMPAIGN) as never);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.rename.mockResolvedValue(undefined);
  });

  it('CAMP-017: updates campaign name and returns 200', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1', { name: 'Updated Name' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Updated Name');
  });

  it('CAMP-018: updates status to paused', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1', { status: 'paused' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('paused');
  });

  it('CAMP-019: returns 400 for invalid name', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1', {
      name: '<img src=x onerror=alert(1)>',
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(400);
  });

  it('CAMP-020: returns 400 for non-https webhookUrl', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1', {
      webhookUrl: 'http://hooks.example.com/notify',
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/https/i);
  });

  it('CAMP-021: returns 404 when campaign does not exist', async () => {
    mockFsPromises.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) as never);

    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/missing', { name: 'X' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'missing' }) });

    expect(res.status).toBe(404);
  });

  it('CAMP-022: returns 400 for invalid campaign ID', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/../evil', { name: 'X' });
    const res = await PATCH(req, { params: Promise.resolve({ id: '../evil' }) });

    expect(res.status).toBe(400);
  });

  it('CAMP-023: rejects selectedSkillIds update with 0 items', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1', {
      selectedSkillIds: [],
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(400);
  });

  it('CAMP-024: accepts null webhookUrl to clear the webhook', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1', {
      webhookUrl: null,
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.webhookUrl).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/sengoku/campaigns/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/sengoku/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockFsPromises.readFile.mockResolvedValue(JSON.stringify(STORED_CAMPAIGN) as never);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.rename.mockResolvedValue(undefined);
  });

  it('CAMP-025: archives campaign and returns { status: archived }', async () => {
    const { DELETE } = await import('../[id]/route');
    const req = makeDeleteRequest('/api/sengoku/campaigns/camp-1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('archived');
  });

  it('CAMP-026: persists archived status to disk', async () => {
    const { DELETE } = await import('../[id]/route');
    const req = makeDeleteRequest('/api/sengoku/campaigns/camp-1');
    await DELETE(req, { params: Promise.resolve({ id: 'camp-1' }) });

    expect(mockFsPromises.writeFile).toHaveBeenCalled();
    const lastWrite = mockFsPromises.writeFile.mock.calls.at(-1);
    const saved = JSON.parse(lastWrite![1] as string);
    expect(saved.status).toBe('archived');
  });

  it('CAMP-027: returns 404 when campaign does not exist', async () => {
    mockFsPromises.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) as never);

    const { DELETE } = await import('../[id]/route');
    const req = makeDeleteRequest('/api/sengoku/campaigns/missing');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'missing' }) });

    expect(res.status).toBe(404);
  });

  it('CAMP-028: returns 400 for invalid campaign ID', async () => {
    const { DELETE } = await import('../[id]/route');
    const req = makeDeleteRequest('/api/sengoku/campaigns/../secret');
    const res = await DELETE(req, { params: Promise.resolve({ id: '../secret' }) });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Auth guard — all endpoints return 401 when checkApiAuth returns a response
// ---------------------------------------------------------------------------

describe('Auth guard on all endpoints', () => {
  const unauthorizedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(unauthorizedResponse as never);
  });

  it('CAMP-029a: POST /api/sengoku/campaigns → 401 when auth fails', async () => {
    const { POST } = await import('../route');
    const req = makePostRequest('/api/sengoku/campaigns', VALID_CAMPAIGN_BODY);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('CAMP-029b: GET /api/sengoku/campaigns → 401 when auth fails', async () => {
    const { GET } = await import('../route');
    const req = makeGetRequest('/api/sengoku/campaigns');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('CAMP-029c: GET /api/sengoku/campaigns/[id] → 401 when auth fails', async () => {
    const { GET } = await import('../[id]/route');
    const req = makeGetRequest('/api/sengoku/campaigns/camp-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(401);
  });

  it('CAMP-029d: PATCH /api/sengoku/campaigns/[id] → 401 when auth fails', async () => {
    const { PATCH } = await import('../[id]/route');
    const req = makePatchRequest('/api/sengoku/campaigns/camp-1', { name: 'X' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(401);
  });

  it('CAMP-029e: DELETE /api/sengoku/campaigns/[id] → 401 when auth fails', async () => {
    const { DELETE } = await import('../[id]/route');
    const req = makeDeleteRequest('/api/sengoku/campaigns/camp-1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'camp-1' }) });
    expect(res.status).toBe(401);
  });
});
