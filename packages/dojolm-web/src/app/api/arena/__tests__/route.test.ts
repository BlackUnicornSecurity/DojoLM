/**
 * File: api/arena/__tests__/route.test.ts
 * Tests for Arena API routes (Story 14.5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

vi.mock('@/lib/arena-runner', () => ({
  scheduleArenaMatchStart: vi.fn(),
}));

vi.mock('@/lib/storage/arena-storage', () => ({
  createMatch: vi.fn(),
  listMatches: vi.fn(),
  getMatch: vi.fn(),
  updateMatch: vi.fn(),
}));

import { scheduleArenaMatchStart } from '@/lib/arena-runner';
import * as arenaStorage from '@/lib/storage/arena-storage';

const mockedStorage = vi.mocked(arenaStorage);
const mockedScheduleArenaMatchStart = vi.mocked(scheduleArenaMatchStart);

function createPostRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), { method: 'GET' });
}

function createDeleteRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), { method: 'DELETE' });
}

describe('POST /api/arena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStorage.createMatch.mockResolvedValue({} as never);
  });

  it('creates a match with valid body', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest('/api/arena', {
      gameMode: 'CTF',
      attackMode: 'kunai',
      fighters: [
        { modelId: 'model-a', modelName: 'A', provider: 'test' },
        { modelId: 'model-b', modelName: 'B', provider: 'test' },
      ],
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.matchId).toBeTruthy();
    expect(data.status).toBe('pending');
    expect(mockedStorage.createMatch).toHaveBeenCalledTimes(1);
    expect(mockedScheduleArenaMatchStart).toHaveBeenCalledWith(data.matchId);
  });

  it('rejects invalid gameMode', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest('/api/arena', {
      gameMode: 'INVALID',
      attackMode: 'kunai',
      fighters: [{ modelId: 'a' }, { modelId: 'b' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('gameMode');
  });

  it('rejects invalid attackMode', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest('/api/arena', {
      gameMode: 'CTF',
      attackMode: 'invalid',
      fighters: [{ modelId: 'a' }, { modelId: 'b' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('attackMode');
  });

  it('rejects fewer than 2 fighters', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest('/api/arena', {
      gameMode: 'CTF',
      attackMode: 'kunai',
      fighters: [{ modelId: 'a' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('fighters');
  });

  it('clamps maxRounds to valid range', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest('/api/arena', {
      gameMode: 'CTF',
      attackMode: 'kunai',
      maxRounds: 500,
      fighters: [{ modelId: 'a' }, { modelId: 'b' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const storedMatch = mockedStorage.createMatch.mock.calls[0][0];
    expect(storedMatch.config.maxRounds).toBeLessThanOrEqual(100);
  });
});

describe('GET /api/arena', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of matches', async () => {
    mockedStorage.listMatches.mockResolvedValue({
      matches: [{ id: 'm1', status: 'completed' }] as never[],
      total: 1,
    });

    const { GET } = await import('../route');
    const req = createGetRequest('/api/arena?status=completed&limit=10');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.matches).toHaveLength(1);
  });

  it('passes status filter', async () => {
    mockedStorage.listMatches.mockResolvedValue({ matches: [], total: 0 });

    const { GET } = await import('../route');
    const req = createGetRequest('/api/arena?status=running');
    await GET(req);

    expect(mockedStorage.listMatches).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'running' })
    );
  });
});

describe('GET /api/arena/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns match detail', async () => {
    const mockMatch = { id: 'match-1', status: 'completed', rounds: [] };
    mockedStorage.getMatch.mockResolvedValue(mockMatch as never);

    const { GET } = await import('../[id]/route');
    const req = createGetRequest('/api/arena/match-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'match-1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('match-1');
  });

  it('returns 404 for non-existent match', async () => {
    mockedStorage.getMatch.mockResolvedValue(null);

    const { GET } = await import('../[id]/route');
    const req = createGetRequest('/api/arena/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });

  it('rejects invalid match ID', async () => {
    const { GET } = await import('../[id]/route');
    const req = createGetRequest('/api/arena/../evil');
    const res = await GET(req, { params: Promise.resolve({ id: '../evil' }) });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/arena/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aborts a running match', async () => {
    const mockMatch = { id: 'match-1', status: 'running' };
    mockedStorage.getMatch.mockResolvedValue(mockMatch as never);
    mockedStorage.updateMatch.mockResolvedValue({ ...mockMatch, status: 'aborted' } as never);

    const { DELETE } = await import('../[id]/route');
    const req = createDeleteRequest('/api/arena/match-1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'match-1' }) });

    expect(res.status).toBe(200);
    expect(mockedStorage.updateMatch).toHaveBeenCalledWith('match-1', expect.objectContaining({ status: 'aborted' }));
  });

  it('returns 404 for non-existent match', async () => {
    mockedStorage.getMatch.mockResolvedValue(null);

    const { DELETE } = await import('../[id]/route');
    const req = createDeleteRequest('/api/arena/nonexistent');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/arena/[id]/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for non-existent match', async () => {
    mockedStorage.getMatch.mockResolvedValue(null);

    const { GET } = await import('../[id]/stream/route');
    const req = createGetRequest('/api/arena/nonexistent/stream');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid match ID', async () => {
    const { GET } = await import('../[id]/stream/route');
    const req = createGetRequest('/api/arena/../evil/stream');
    const res = await GET(req, { params: Promise.resolve({ id: '../evil' }) });

    expect(res.status).toBe(400);
  });

  it('returns SSE stream for existing match', async () => {
    const mockMatch = {
      id: 'match-1',
      status: 'completed',
      rounds: [],
      scores: {},
      events: [],
      winnerId: null,
      winReason: null,
    };
    mockedStorage.getMatch.mockResolvedValue(mockMatch as never);

    const { GET } = await import('../[id]/stream/route');
    const req = createGetRequest('/api/arena/match-1/stream');
    const res = await GET(req, { params: Promise.resolve({ id: 'match-1' }) });

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(res.headers.get('X-Accel-Buffering')).toBe('no');
  });

  it('streams full match events and completion scores', async () => {
    mockedStorage.getMatch
      .mockResolvedValueOnce({
        id: 'match-1',
        status: 'running',
        rounds: [],
        scores: { 'model-a': 0 },
        events: [],
        winnerId: null,
        winReason: null,
      } as never)
      .mockResolvedValueOnce({
        id: 'match-1',
        status: 'completed',
        rounds: [
          {
            roundNumber: 0,
          },
        ],
        scores: { 'model-a': 25 },
        events: [
          {
            id: 'evt-1',
            matchId: 'match-1',
            round: 0,
            timestamp: new Date().toISOString(),
            type: 'match_start',
            fighterId: '',
            role: 'attacker',
            data: { gameMode: 'CTF' },
          },
        ],
        winnerId: 'model-a',
        winReason: 'victory_points',
      } as never);

    const { GET } = await import('../[id]/stream/route');
    const req = createGetRequest('/api/arena/match-1/stream');
    const res = await GET(req, { params: Promise.resolve({ id: 'match-1' }) });
    const body = await res.text();

    expect(body).toContain('event: match_event');
    expect(body).toContain('"id":"evt-1"');
    expect(body).toContain('"matchId":"match-1"');
    expect(body).toContain('event: match_complete');
    expect(body).toContain('"scores":{"model-a":25}');
  });
});
