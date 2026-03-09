/**
 * File: arena-storage.test.ts
 * Tests for arena-storage.ts (Story 14.4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    rename: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
  },
}));

import fs from 'node:fs/promises';
import {
  createMatch,
  getMatch,
  updateMatch,
  deleteMatch,
  listMatches,
  getWarriors,
  updateWarrior,
  updateWarriorAfterMatch,
} from '../arena-storage';
import type { ArenaMatch } from '../../arena-types';

const mockedFs = vi.mocked(fs);

function makeMatch(overrides: Record<string, unknown> = {}): ArenaMatch {
  return {
    id: 'match-001',
    config: {
      gameMode: 'CTF',
      attackMode: 'kunai',
      maxRounds: 20,
      victoryPoints: 100,
      roundTimeoutMs: 30000,
      roleSwitchInterval: 5,
    },
    fighters: [
      { modelId: 'model-a', modelName: 'A', provider: 'test', initialRole: 'attacker' },
      { modelId: 'model-b', modelName: 'B', provider: 'test', initialRole: 'defender' },
    ],
    status: 'running',
    rounds: [],
    scores: { 'model-a': 0, 'model-b': 0 },
    winnerId: null,
    winReason: null,
    events: [],
    createdAt: '2026-03-08T00:00:00.000Z',
    startedAt: null,
    completedAt: null,
    totalDurationMs: 0,
    metadata: {},
    ...overrides,
  } as ArenaMatch;
}

describe('arena-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empty index
    mockedFs.readFile.mockResolvedValue(JSON.stringify({ matchIds: [], totalCount: 0 }));
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.rename.mockResolvedValue(undefined);
    mockedFs.mkdir.mockResolvedValue(undefined);
  });

  describe('createMatch', () => {
    it('creates a match and updates index', async () => {
      const match = makeMatch();
      const result = await createMatch(match);
      expect(result.id).toBe('match-001');
      expect(mockedFs.writeFile).toHaveBeenCalled();
      expect(mockedFs.rename).toHaveBeenCalled();
    });

    it('rejects invalid match IDs', async () => {
      const match = makeMatch({ id: '../traversal' });
      await expect(createMatch(match)).rejects.toThrow('invalid id');
    });

    it('rejects empty ID', async () => {
      const match = makeMatch({ id: '' });
      await expect(createMatch(match)).rejects.toThrow('invalid id');
    });
  });

  describe('getMatch', () => {
    it('returns match from storage', async () => {
      const match = makeMatch();
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(match));
      const result = await getMatch('match-001');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('match-001');
    });

    it('returns null for invalid ID', async () => {
      const result = await getMatch('../../../etc/passwd');
      expect(result).toBeNull();
    });

    it('returns null for non-existent match', async () => {
      mockedFs.readFile.mockRejectedValueOnce(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );
      const result = await getMatch('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateMatch', () => {
    it('updates match fields', async () => {
      const match = makeMatch();
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(match));
      const result = await updateMatch('match-001', { status: 'completed' } as Partial<ArenaMatch>);
      expect(result).not.toBeNull();
      expect(result!.status).toBe('completed');
      expect(result!.id).toBe('match-001');
    });

    it('returns null for non-existent match', async () => {
      mockedFs.readFile.mockRejectedValueOnce(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );
      const result = await updateMatch('nonexistent', { status: 'completed' } as Partial<ArenaMatch>);
      expect(result).toBeNull();
    });
  });

  describe('deleteMatch', () => {
    it('deletes a match and updates index', async () => {
      // First readFile call (after unlink) is for index
      mockedFs.readFile.mockResolvedValueOnce(
        JSON.stringify({ matchIds: ['match-001'], totalCount: 1 })
      );

      const result = await deleteMatch('match-001');
      expect(result).toBe(true);
      expect(mockedFs.unlink).toHaveBeenCalled();
    });

    it('returns false for invalid ID', async () => {
      const result = await deleteMatch('../evil');
      expect(result).toBe(false);
    });
  });

  describe('listMatches', () => {
    it('returns matches filtered by status', async () => {
      const index = { matchIds: ['m1', 'm2'], totalCount: 2 };
      const m1 = makeMatch({ id: 'm1', status: 'running' });
      const m2 = makeMatch({ id: 'm2', status: 'completed' });

      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(index))
        .mockResolvedValueOnce(JSON.stringify(m2))
        .mockResolvedValueOnce(JSON.stringify(m1));

      const result = await listMatches({ status: 'completed' });
      expect(result.total).toBe(1);
      expect(result.matches[0].id).toBe('m2');
    });

    it('respects limit and offset', async () => {
      const ids = ['m1', 'm2', 'm3'];
      const index = { matchIds: ids, totalCount: 3 };

      // No status filter: reversed=['m3','m2','m1'], slice(1,3)=['m2','m1']
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(index));
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(makeMatch({ id: 'm2' })));
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(makeMatch({ id: 'm1' })));

      const result = await listMatches({ limit: 2, offset: 1 });
      expect(result.matches).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe('warrior operations', () => {
    it('getWarriors returns sorted by winRate', async () => {
      const store = {
        warriors: {
          'model-a': { modelId: 'model-a', winRate: 0.3 },
          'model-b': { modelId: 'model-b', winRate: 0.8 },
        },
      };
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(store));
      const warriors = await getWarriors();
      expect(warriors[0].modelId).toBe('model-b');
      expect(warriors[1].modelId).toBe('model-a');
    });

    it('updateWarriorAfterMatch creates new warrior on first match', async () => {
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify({ warriors: {} }));
      const card = await updateWarriorAfterMatch(
        'model-new', 'New Model', 'openai', true, false, 85, 'CTF'
      );
      expect(card.totalMatches).toBe(1);
      expect(card.wins).toBe(1);
      expect(card.winRate).toBe(1);
      expect(card.bestScore).toBe(85);
    });

    it('updateWarriorAfterMatch updates existing warrior', async () => {
      const store = {
        warriors: {
          'model-a': {
            modelId: 'model-a',
            modelName: 'A',
            provider: 'test',
            totalMatches: 5,
            wins: 3,
            losses: 2,
            draws: 0,
            winRate: 0.6,
            avgScore: 70,
            bestScore: 90,
            favoriteGameMode: 'CTF',
            lastMatchAt: null,
          },
        },
      };
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(store));
      const card = await updateWarriorAfterMatch(
        'model-a', 'A', 'test', false, false, 50, 'KOTH'
      );
      expect(card.totalMatches).toBe(6);
      expect(card.losses).toBe(3);
      expect(card.winRate).toBe(0.5);
    });

    it('updateWarrior rejects invalid modelId', async () => {
      await expect(
        updateWarrior({ modelId: '../evil' } as never)
      ).rejects.toThrow('invalid modelId');
    });
  });
});
