/**
 * File: arena/warriors/__tests__/route.test.ts
 * Purpose: Tests for GET/PATCH /api/arena/warriors
 * Source: src/app/api/arena/warriors/route.ts
 *
 * Index:
 * - WAR-001: GET lists warriors (line 47)
 * - WAR-002: GET returns total count (line 60)
 * - WAR-003: PATCH valid update returns warrior (line 70)
 * - WAR-004: PATCH invalid modelId returns 400 (line 93)
 * - WAR-005: PATCH missing modelName returns 400 (line 104)
 * - WAR-006: PATCH XSS in modelName returns 400 (line 114)
 * - WAR-007: PATCH invalid provider returns 400 (line 124)
 * - WAR-008: PATCH non-boolean won/drew returns 400 (line 134)
 * - WAR-009: PATCH won+drew both true returns 400 (line 144)
 * - WAR-010: PATCH negative score returns 400 (line 155)
 * - WAR-011: PATCH invalid gameMode returns 400 (line 165)
 * - WAR-012: PATCH valid game modes (CTF, KOTH, RvB) (line 175)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetWarriors = vi.fn();
const mockUpdateWarriorAfterMatch = vi.fn();

vi.mock('@/lib/storage/arena-storage', () => ({
  getWarriors: (...args: unknown[]) => mockGetWarriors(...args),
  updateWarriorAfterMatch: (...args: unknown[]) => mockUpdateWarriorAfterMatch(...args),
}));

vi.mock('@/lib/api-handler', () => ({
  createApiHandler: (handler: Function, _opts?: unknown) => handler,
}));

function createPatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/arena/warriors', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetWarriors.mockResolvedValue([]);
  mockUpdateWarriorAfterMatch.mockResolvedValue({ id: 'w1', wins: 1 });
});

const validBody = {
  modelId: 'model-1',
  modelName: 'GPT-4',
  provider: 'openai',
  won: true,
  drew: false,
  score: 85,
  gameMode: 'CTF',
};

describe('GET /api/arena/warriors', () => {
  it('WAR-001: lists warriors with 200', async () => {
    mockGetWarriors.mockResolvedValue([
      { id: 'w1', modelName: 'GPT-4', wins: 10, losses: 2 },
      { id: 'w2', modelName: 'Claude', wins: 8, losses: 4 },
    ]);

    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.warriors).toHaveLength(2);
  });

  it('WAR-002: returns total count', async () => {
    mockGetWarriors.mockResolvedValue([{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }]);

    const { GET } = await import('../route');
    const res = await GET();
    const json = await res.json();
    expect(json.total).toBe(3);
  });
});

describe('PATCH /api/arena/warriors', () => {
  it('WAR-003: valid update returns warrior', async () => {
    const warrior = { id: 'w1', modelId: 'model-1', wins: 1, losses: 0, draws: 0 };
    mockUpdateWarriorAfterMatch.mockResolvedValue(warrior);

    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.warrior).toBeDefined();
    expect(mockUpdateWarriorAfterMatch).toHaveBeenCalledWith(
      'model-1', 'GPT-4', 'openai', true, false, 85, 'CTF'
    );
  });

  it('WAR-004: invalid modelId format returns 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest({ ...validBody, modelId: '<script>' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('modelId');
  });

  it('WAR-005: empty modelName returns 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest({ ...validBody, modelName: '' }));
    expect(res.status).toBe(400);
  });

  it('WAR-006: XSS characters in modelName returns 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest({ ...validBody, modelName: '<img onerror=alert(1)>' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('modelName');
  });

  it('WAR-007: invalid provider returns 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest({ ...validBody, provider: '' }));
    expect(res.status).toBe(400);
  });

  it('WAR-008: non-boolean won/drew returns 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest({ ...validBody, won: 'yes', drew: 'no' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('boolean');
  });

  it('WAR-009: won and drew both true returns 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest({ ...validBody, won: true, drew: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('both');
  });

  it('WAR-010: negative score returns 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest({ ...validBody, score: -5 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('score');
  });

  it('WAR-011: invalid gameMode returns 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(createPatchRequest({ ...validBody, gameMode: 'DEATHMATCH' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('gameMode');
  });

  it('WAR-012: accepts all valid game modes (CTF, KOTH, RvB)', async () => {
    const { PATCH } = await import('../route');

    for (const mode of ['CTF', 'KOTH', 'RvB']) {
      mockUpdateWarriorAfterMatch.mockResolvedValue({ id: 'w1' });
      const res = await PATCH(createPatchRequest({ ...validBody, gameMode: mode }));
      expect(res.status).toBe(200);
    }
  });

  it('WAR-013: invalid JSON body returns 400', async () => {
    const { PATCH } = await import('../route');
    const req = new NextRequest('http://localhost:3000/api/arena/warriors', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{',
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
