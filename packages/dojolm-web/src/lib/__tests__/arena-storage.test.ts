/**
 * File: arena-storage.test.ts
 * Purpose: Tests for Arena match and warrior file-based storage
 * Source: src/lib/storage/arena-storage.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock fs and runtime-paths before any imports
// ---------------------------------------------------------------------------

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockRename = vi.fn();
const mockUnlink = vi.fn();

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    rename: (...args: unknown[]) => mockRename(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
  },
}));

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (...segments: string[]) => `/mock-data/${segments.join('/')}`,
}));

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------

import {
  createMatch,
  getMatch,
  updateMatch,
  deleteMatch,
  listMatches,
  getWarriors,
  getWarrior,
  updateWarrior,
  updateWarriorAfterMatch,
} from '../storage/arena-storage';
import type { ArenaMatch, WarriorCard } from '../arena-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMatch(overrides: Partial<ArenaMatch> = {}): ArenaMatch {
  return {
    id: 'match-001',
    config: {
      gameMode: 'CTF',
      attackMode: 'kunai',
      maxRounds: 10,
      victoryPoints: 5,
      roundTimeoutMs: 30000,
      roleSwitchInterval: 3,
    },
    fighters: [
      { modelId: 'model-a', modelName: 'Model A', provider: 'openai', initialRole: 'attacker' },
      { modelId: 'model-b', modelName: 'Model B', provider: 'anthropic', initialRole: 'defender' },
    ],
    status: 'pending',
    rounds: [],
    scores: { 'model-a': 0, 'model-b': 0 },
    winnerId: null,
    winReason: null,
    events: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    totalDurationMs: 0,
    metadata: {},
    ...overrides,
  };
}

function makeWarrior(overrides: Partial<WarriorCard> = {}): WarriorCard {
  return {
    modelId: 'warrior-001',
    modelName: 'Test Warrior',
    provider: 'openai',
    totalMatches: 10,
    wins: 6,
    losses: 3,
    draws: 1,
    winRate: 0.6,
    avgScore: 75,
    bestScore: 95,
    favoriteGameMode: 'CTF',
    lastMatchAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('arena-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
  });

  // -----------------------------------------------------------------------
  // ID validation
  // -----------------------------------------------------------------------

  describe('ID validation', () => {
    it('rejects match with empty id', async () => {
      await expect(createMatch(makeMatch({ id: '' }))).rejects.toThrow('Invalid match');
    });

    it('rejects match with path-traversal id', async () => {
      await expect(createMatch(makeMatch({ id: '../../etc/passwd' }))).rejects.toThrow('Invalid match');
    });

    it('rejects match with spaces in id', async () => {
      await expect(createMatch(makeMatch({ id: 'bad id' }))).rejects.toThrow('Invalid match');
    });

    it('accepts valid alphanumeric-dash-underscore IDs', async () => {
      const match = makeMatch({ id: 'valid-match_123' });
      const result = await createMatch(match);
      expect(result.id).toBe('valid-match_123');
    });
  });

  // -----------------------------------------------------------------------
  // createMatch
  // -----------------------------------------------------------------------

  describe('createMatch', () => {
    it('writes match file and updates index', async () => {
      const match = makeMatch();
      const result = await createMatch(match);

      expect(result.id).toBe('match-001');
      expect(mockWriteFile).toHaveBeenCalled();

      // Index should contain the match id
      const indexWriteCall = mockWriteFile.mock.calls.find(
        (c) => (c[0] as string).includes('index.json'),
      );
      expect(indexWriteCall).toBeDefined();
      const indexContent = JSON.parse(indexWriteCall![1] as string);
      expect(indexContent.matchIds).toContain('match-001');
    });

    it('does not duplicate match id in index', async () => {
      // Simulate existing index that already contains the match id
      const existingIndex = { matchIds: ['match-001'], totalCount: 1 };
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(existingIndex));
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      await createMatch(makeMatch());

      // Index write should NOT have been called (id already in index)
      const indexWriteCalls = mockWriteFile.mock.calls.filter(
        (c) => (c[0] as string).includes('index.json'),
      );
      expect(indexWriteCalls.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getMatch
  // -----------------------------------------------------------------------

  describe('getMatch', () => {
    it('returns null for invalid IDs', async () => {
      expect(await getMatch('../../etc/passwd')).toBeNull();
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('returns null when match does not exist', async () => {
      expect(await getMatch('nonexistent')).toBeNull();
    });

    it('returns the match when it exists', async () => {
      const match = makeMatch();
      mockReadFile.mockResolvedValueOnce(JSON.stringify(match));

      const result = await getMatch('match-001');
      expect(result).toBeDefined();
      expect(result!.id).toBe('match-001');
    });
  });

  // -----------------------------------------------------------------------
  // updateMatch
  // -----------------------------------------------------------------------

  describe('updateMatch', () => {
    it('returns null when match does not exist', async () => {
      expect(await updateMatch('nonexistent', { status: 'running' })).toBeNull();
    });

    it('updates fields while preserving the original id', async () => {
      const match = makeMatch();
      mockReadFile.mockResolvedValueOnce(JSON.stringify(match));

      const result = await updateMatch('match-001', { status: 'running', winnerId: 'model-a' });
      expect(result).toBeDefined();
      expect(result!.id).toBe('match-001');
      expect(result!.status).toBe('running');
      expect(result!.winnerId).toBe('model-a');
    });

    it('prevents id from being changed via updates', async () => {
      const match = makeMatch();
      mockReadFile.mockResolvedValueOnce(JSON.stringify(match));

      const result = await updateMatch('match-001', { id: 'hijacked' } as Partial<ArenaMatch>);
      expect(result!.id).toBe('match-001');
    });
  });

  // -----------------------------------------------------------------------
  // deleteMatch
  // -----------------------------------------------------------------------

  describe('deleteMatch', () => {
    it('returns false for invalid IDs', async () => {
      expect(await deleteMatch('../evil')).toBe(false);
    });

    it('returns false when match does not exist', async () => {
      mockUnlink.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      expect(await deleteMatch('nonexistent')).toBe(false);
    });

    it('deletes file and removes from index', async () => {
      mockUnlink.mockResolvedValueOnce(undefined);
      const index = { matchIds: ['match-001', 'match-002'], totalCount: 2 };
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await deleteMatch('match-001');
      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalled();

      const indexWriteCall = mockWriteFile.mock.calls.find(
        (c) => (c[0] as string).includes('index.json'),
      );
      const updatedIndex = JSON.parse(indexWriteCall![1] as string);
      expect(updatedIndex.matchIds).not.toContain('match-001');
      expect(updatedIndex.matchIds).toContain('match-002');
      expect(updatedIndex.totalCount).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // listMatches (pagination)
  // -----------------------------------------------------------------------

  describe('listMatches', () => {
    it('returns empty when no matches exist', async () => {
      const result = await listMatches();
      expect(result.matches).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns matches in reverse order (newest first)', async () => {
      const ids = ['m1', 'm2', 'm3'];
      const index = { matchIds: ids, totalCount: 3 };
      const matches: Record<string, ArenaMatch> = {
        m1: makeMatch({ id: 'm1' }),
        m2: makeMatch({ id: 'm2' }),
        m3: makeMatch({ id: 'm3' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, m] of Object.entries(matches)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(m));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await listMatches();
      expect(result.total).toBe(3);
      expect(result.matches[0].id).toBe('m3');
      expect(result.matches[2].id).toBe('m1');
    });

    it('paginates with offset and limit', async () => {
      const ids = ['m1', 'm2', 'm3', 'm4', 'm5'];
      const index = { matchIds: ids, totalCount: 5 };
      const matches: Record<string, ArenaMatch> = {};
      for (const id of ids) {
        matches[id] = makeMatch({ id });
      }

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, m] of Object.entries(matches)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(m));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await listMatches({ offset: 1, limit: 2 });
      expect(result.matches.length).toBe(2);
      expect(result.total).toBe(5);
    });

    it('filters by status when provided', async () => {
      const ids = ['m1', 'm2', 'm3'];
      const index = { matchIds: ids, totalCount: 3 };
      const matches: Record<string, ArenaMatch> = {
        m1: makeMatch({ id: 'm1', status: 'completed' }),
        m2: makeMatch({ id: 'm2', status: 'pending' }),
        m3: makeMatch({ id: 'm3', status: 'completed' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, m] of Object.entries(matches)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(m));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await listMatches({ status: 'completed' });
      expect(result.matches.length).toBe(2);
      expect(result.matches.every((m) => m.status === 'completed')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Warrior CRUD
  // -----------------------------------------------------------------------

  describe('getWarriors', () => {
    it('returns empty array when no warriors exist', async () => {
      const result = await getWarriors();
      expect(result).toEqual([]);
    });

    it('returns warriors sorted by winRate descending', async () => {
      const store = {
        warriors: {
          'w1': makeWarrior({ modelId: 'w1', winRate: 0.3 }),
          'w2': makeWarrior({ modelId: 'w2', winRate: 0.9 }),
          'w3': makeWarrior({ modelId: 'w3', winRate: 0.6 }),
        },
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await getWarriors();
      expect(result.length).toBe(3);
      expect(result[0].modelId).toBe('w2');
      expect(result[1].modelId).toBe('w3');
      expect(result[2].modelId).toBe('w1');
    });
  });

  describe('getWarrior', () => {
    it('returns null for invalid modelId', async () => {
      expect(await getWarrior('../../evil')).toBeNull();
    });

    it('returns null when warrior does not exist', async () => {
      expect(await getWarrior('nonexistent')).toBeNull();
    });

    it('returns the warrior when found', async () => {
      const store = { warriors: { 'w1': makeWarrior({ modelId: 'w1' }) } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await getWarrior('w1');
      expect(result).toBeDefined();
      expect(result!.modelId).toBe('w1');
    });
  });

  describe('updateWarrior', () => {
    it('throws for invalid modelId', async () => {
      await expect(
        updateWarrior(makeWarrior({ modelId: '' })),
      ).rejects.toThrow('Invalid warrior');
    });

    it('saves warrior to the store', async () => {
      const store = { warriors: {} };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const card = makeWarrior({ modelId: 'new-warrior' });
      const result = await updateWarrior(card);
      expect(result.modelId).toBe('new-warrior');
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // updateWarriorAfterMatch (stats calculations)
  // -----------------------------------------------------------------------

  describe('updateWarriorAfterMatch', () => {
    it('creates a new warrior card when none exists', async () => {
      const store = { warriors: {} };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('new-w', 'New Warrior', 'openai', true, false, 80, 'CTF');
      expect(result.modelId).toBe('new-w');
      expect(result.totalMatches).toBe(1);
      expect(result.wins).toBe(1);
      expect(result.losses).toBe(0);
      expect(result.draws).toBe(0);
      expect(result.winRate).toBe(1);
      expect(result.avgScore).toBe(80);
      expect(result.bestScore).toBe(80);
      expect(result.favoriteGameMode).toBe('CTF');
      expect(result.lastMatchAt).toBeTruthy();
    });

    it('increments wins correctly', async () => {
      const existing = makeWarrior({ modelId: 'w1', totalMatches: 5, wins: 3, losses: 2, draws: 0, winRate: 0.6, avgScore: 70, bestScore: 90 });
      const store = { warriors: { w1: existing } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('w1', 'Warrior 1', 'openai', true, false, 85, 'CTF');
      expect(result.totalMatches).toBe(6);
      expect(result.wins).toBe(4);
      expect(result.losses).toBe(2);
      expect(result.winRate).toBeCloseTo(4 / 6);
    });

    it('increments losses correctly', async () => {
      const existing = makeWarrior({ modelId: 'w1', totalMatches: 5, wins: 3, losses: 2, draws: 0 });
      const store = { warriors: { w1: existing } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('w1', 'Warrior 1', 'openai', false, false, 30, 'CTF');
      expect(result.losses).toBe(3);
      expect(result.wins).toBe(3);
    });

    it('increments draws correctly', async () => {
      const existing = makeWarrior({ modelId: 'w1', totalMatches: 5, wins: 3, losses: 1, draws: 1 });
      const store = { warriors: { w1: existing } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('w1', 'Warrior 1', 'openai', false, true, 50, 'KOTH');
      expect(result.draws).toBe(2);
      expect(result.wins).toBe(3);
      expect(result.losses).toBe(1);
    });

    it('computes winRate as wins / totalMatches', async () => {
      const store = { warriors: {} };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('wr', 'WR Test', 'openai', false, false, 50, 'CTF');
      // 0 wins / 1 total = 0
      expect(result.winRate).toBe(0);
    });

    it('computes avgScore as running average', async () => {
      const existing = makeWarrior({
        modelId: 'avg',
        totalMatches: 3,
        avgScore: 60,
        bestScore: 80,
      });
      const store = { warriors: { avg: existing } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      // After 4th match with score 100:
      // avgScore = (60 * 3 + 100) / 4 = 280 / 4 = 70
      const result = await updateWarriorAfterMatch('avg', 'Avg Test', 'openai', true, false, 100, 'CTF');
      expect(result.totalMatches).toBe(4);
      expect(result.avgScore).toBeCloseTo(70);
    });

    it('updates bestScore when new score is higher', async () => {
      const existing = makeWarrior({ modelId: 'bs', bestScore: 80 });
      const store = { warriors: { bs: existing } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('bs', 'BS Test', 'openai', true, false, 95, 'CTF');
      expect(result.bestScore).toBe(95);
    });

    it('does not lower bestScore when new score is lower', async () => {
      const existing = makeWarrior({ modelId: 'bs2', bestScore: 90 });
      const store = { warriors: { bs2: existing } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('bs2', 'BS2 Test', 'openai', false, false, 40, 'CTF');
      expect(result.bestScore).toBe(90);
    });

    it('updates modelName and provider on every call', async () => {
      const existing = makeWarrior({ modelId: 'up', modelName: 'Old Name', provider: 'old-prov' });
      const store = { warriors: { up: existing } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('up', 'New Name', 'new-prov', true, false, 50, 'RvB');
      expect(result.modelName).toBe('New Name');
      expect(result.provider).toBe('new-prov');
    });

    it('sets favoriteGameMode to the last-played mode', async () => {
      const existing = makeWarrior({ modelId: 'gm', favoriteGameMode: 'CTF' });
      const store = { warriors: { gm: existing } };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(store));

      const result = await updateWarriorAfterMatch('gm', 'GM Test', 'openai', true, false, 50, 'KOTH');
      expect(result.favoriteGameMode).toBe('KOTH');
    });
  });
});
