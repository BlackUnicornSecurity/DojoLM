/**
 * File: api/arena/export/__tests__/route.test.ts
 * Tests for Arena export API route (Story 19.3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-handler', () => ({
  createApiHandler: vi.fn().mockImplementation((handler: Function) => {
    return async (request: NextRequest) => {
      return handler(request);
    };
  }),
}));

const mockGetMatch = vi.fn();
vi.mock('@/lib/storage/arena-storage', () => ({
  getMatch: (...args: unknown[]) => mockGetMatch(...args),
}));

const mockSaveFinding = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/storage/ecosystem-storage', () => ({
  saveFinding: (...args: unknown[]) => mockSaveFinding(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeMatch(overrides = {}) {
  return {
    id: 'test-match-123',
    config: {
      gameMode: 'CTF',
      attackMode: 'kunai',
      maxRounds: 20,
      victoryPoints: 100,
      roundTimeoutMs: 30000,
      roleSwitchInterval: 5,
    },
    fighters: [
      { modelId: 'model-a', modelName: 'Model A', provider: 'test', initialRole: 'attacker' },
      { modelId: 'model-b', modelName: 'Model B', provider: 'test', initialRole: 'defender' },
    ],
    status: 'completed',
    rounds: [
      {
        roundNumber: 1,
        attackerId: 'model-a',
        defenderId: 'model-b',
        attackSource: { type: 'template', id: 'tpl-1' },
        prompt: 'test attack prompt',
        response: 'test response',
        injectionSuccess: 0.7,
        scanVerdict: 'BLOCK',
        scanSeverity: 'WARNING',
        scores: { 'model-a': 25, 'model-b': 0 },
        events: [],
        durationMs: 1500,
        timestamp: '2026-03-09T10:00:00.000Z',
      },
      {
        roundNumber: 2,
        attackerId: 'model-a',
        defenderId: 'model-b',
        attackSource: { type: 'template', id: 'tpl-2' },
        prompt: 'another attack',
        response: 'blocked response',
        injectionSuccess: 0.2,
        scanVerdict: 'ALLOW',
        scanSeverity: null,
        scores: { 'model-a': 0, 'model-b': 10 },
        events: [],
        durationMs: 1200,
        timestamp: '2026-03-09T10:00:02.000Z',
      },
    ],
    scores: { 'model-a': 25, 'model-b': 10 },
    winnerId: 'model-a',
    winReason: 'Victory points reached',
    events: [],
    createdAt: '2026-03-09T09:59:00.000Z',
    startedAt: '2026-03-09T10:00:00.000Z',
    completedAt: '2026-03-09T10:00:05.000Z',
    totalDurationMs: 5000,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import route under test
// ---------------------------------------------------------------------------

import { POST } from '../route';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/arena/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMatch.mockReset();
    mockSaveFinding.mockReset();
    mockSaveFinding.mockResolvedValue(undefined);
  });

  // 1. DNA format — returns success with correct vectorCount
  it('returns success with vectorCount for DNA format', async () => {
    const match = makeMatch();
    mockGetMatch.mockResolvedValue(match);

    const req = createPostRequest('/api/arena/export', {
      matchId: 'test-match-123',
      format: 'dna',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // Only round 1 has injectionSuccess >= 0.5 (0.7); round 2 is 0.2
    expect(json.vectorCount).toBe(1);
  });

  // 2. Training format — returns JSONL with correct headers
  it('returns JSONL content with correct Content-Type for training format', async () => {
    const match = makeMatch();
    mockGetMatch.mockResolvedValue(match);

    const req = createPostRequest('/api/arena/export', {
      matchId: 'test-match-123',
      format: 'training',
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/jsonl');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('.jsonl');
  });

  // 3. Markdown format — returns markdown with correct headers
  it('returns markdown with correct headers for markdown format', async () => {
    const match = makeMatch();
    mockGetMatch.mockResolvedValue(match);

    const req = createPostRequest('/api/arena/export', {
      matchId: 'test-match-123',
      format: 'markdown',
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/markdown');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('.md');
  });

  // 4. Invalid JSON — returns 400
  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest(new URL('/api/arena/export', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{{{',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // 5. Missing matchId — returns 400
  it('returns 400 when matchId is missing', async () => {
    const req = createPostRequest('/api/arena/export', { format: 'dna' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('matchId');
  });

  // 6. Invalid matchId format (path traversal) — returns 400
  it('returns 400 for invalid matchId format with path traversal', async () => {
    const req = createPostRequest('/api/arena/export', {
      matchId: '../hack',
      format: 'dna',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid matchId');
  });

  // 7. Invalid format — returns 400
  it('returns 400 for invalid export format', async () => {
    const req = createPostRequest('/api/arena/export', {
      matchId: 'test-match-123',
      format: 'csv',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid format');
  });

  // 8. Non-existent matchId — returns 404
  it('returns 404 when match does not exist', async () => {
    mockGetMatch.mockResolvedValue(null);

    const req = createPostRequest('/api/arena/export', {
      matchId: 'nonexistent-id',
      format: 'dna',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain('not found');
  });

  // 9. DNA export calls saveFinding for each vector
  it('calls saveFinding for each qualifying vector during DNA export', async () => {
    const match = makeMatch();
    mockGetMatch.mockResolvedValue(match);

    const req = createPostRequest('/api/arena/export', {
      matchId: 'test-match-123',
      format: 'dna',
    });

    await POST(req);

    // Only 1 round qualifies (injectionSuccess >= 0.5)
    expect(mockSaveFinding).toHaveBeenCalledTimes(1);
    expect(mockSaveFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceModule: 'arena',
        findingType: 'attack_variant',
        severity: 'WARNING',
      }),
    );
  });

  // 10. Training JSONL has correct line count
  it('training JSONL has one line per round', async () => {
    const match = makeMatch();
    mockGetMatch.mockResolvedValue(match);

    const req = createPostRequest('/api/arena/export', {
      matchId: 'test-match-123',
      format: 'training',
    });

    const res = await POST(req);
    const body = await res.text();
    const lines = body.split('\n').filter(Boolean);

    expect(lines).toHaveLength(match.rounds.length);
    // Each line should be valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  // 11. Markdown contains match ID and game mode
  it('markdown report contains match ID and game mode', async () => {
    const match = makeMatch();
    mockGetMatch.mockResolvedValue(match);

    const req = createPostRequest('/api/arena/export', {
      matchId: 'test-match-123',
      format: 'markdown',
    });

    const res = await POST(req);
    const body = await res.text();

    expect(body).toContain('test-match-123');
    expect(body).toContain('CTF');
    expect(body).toContain('Arena Match Report');
  });

  // 12. matchId with path traversal characters gets rejected
  it('rejects matchId containing slash characters', async () => {
    const req = createPostRequest('/api/arena/export', {
      matchId: 'foo/bar',
      format: 'dna',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
