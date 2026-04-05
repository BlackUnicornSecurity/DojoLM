/**
 * Tests for arena, SAGE, and warrior mock data
 */

import { describe, it, expect } from 'vitest';
import { getDemoArenaMatches, DEMO_WARRIORS, DEMO_SAGE_POOL, DEMO_SAGE_SEEDS, DEMO_SAGE_MUTATIONS, DEMO_SAGE_QUARANTINE } from '../mock-arena';

describe('Mock Arena Matches', () => {
  const matches = getDemoArenaMatches();

  it('has 12 matches', () => {
    expect(matches).toHaveLength(12);
  });

  it('has 4 CTF, 4 KOTH, 4 RvB matches', () => {
    const ctf = matches.filter(m => m.config.gameMode === 'CTF');
    const koth = matches.filter(m => m.config.gameMode === 'KOTH');
    const rvb = matches.filter(m => m.config.gameMode === 'RvB');
    expect(ctf).toHaveLength(4);
    expect(koth).toHaveLength(4);
    expect(rvb).toHaveLength(4);
  });

  it('all matches are completed', () => {
    for (const m of matches) {
      expect(m.status).toBe('completed');
    }
  });

  it('all matches have a winner', () => {
    for (const m of matches) {
      expect(m.winnerId).toBeTruthy();
    }
  });

  it('Marfaak wins most matches', () => {
    const marfaakWins = matches.filter(m => m.winnerId === 'demo-model-marfaak');
    expect(marfaakWins.length).toBeGreaterThanOrEqual(5);
  });

  it('all matches have rounds', () => {
    for (const m of matches) {
      expect(m.rounds.length).toBeGreaterThan(0);
      expect(m.rounds.length).toBe(m.config.maxRounds);
    }
  });

  it('all matches have events', () => {
    for (const m of matches) {
      expect(m.events.length).toBeGreaterThan(2); // at least start + end
    }
  });

  it('matches have 2 fighters each', () => {
    for (const m of matches) {
      expect(m.fighters).toHaveLength(2);
    }
  });

  it('uses varied attack modes', () => {
    const modes = new Set(matches.map(m => m.config.attackMode));
    expect(modes.size).toBe(4);
  });
});

describe('Mock Warriors', () => {
  it('has 8 warrior cards', () => {
    expect(DEMO_WARRIORS).toHaveLength(8);
  });

  it('Marfaak is ranked #1 by win rate', () => {
    const sorted = [...DEMO_WARRIORS].sort((a, b) => b.winRate - a.winRate);
    expect(sorted[0].modelName).toBe('Marfaak-70B');
  });

  it('Basileak has 0% win rate (tied lowest)', () => {
    const basileak = DEMO_WARRIORS.find(w => w.modelName === 'Basileak-7B');
    expect(basileak?.winRate).toBe(0.0);
    expect(basileak?.wins).toBe(0);
  });

  it('all warriors have required fields', () => {
    for (const w of DEMO_WARRIORS) {
      expect(w.modelId).toBeTruthy();
      expect(w.modelName).toBeTruthy();
      expect(w.provider).toBeTruthy();
      expect(typeof w.totalMatches).toBe('number');
      expect(typeof w.wins).toBe('number');
      expect(typeof w.losses).toBe('number');
      expect(typeof w.draws).toBe('number');
      expect(typeof w.winRate).toBe('number');
      expect(w.recentScores?.length).toBeGreaterThan(0);
      expect(w.recentResults?.length).toBeGreaterThan(0);
    }
  });

  it('W+L+D equals totalMatches for each warrior', () => {
    for (const w of DEMO_WARRIORS) {
      expect(w.wins + w.losses + w.draws).toBe(w.totalMatches);
    }
  });
});

describe('Mock SAGE', () => {
  it('pool has valid metrics', () => {
    expect(DEMO_SAGE_POOL.generation).toBe(142);
    expect(DEMO_SAGE_POOL.bestFitness).toBe(0.94);
    expect(DEMO_SAGE_POOL.entries.length).toBe(10);
  });

  it('fitness history has increasing trend', () => {
    const history = DEMO_SAGE_POOL.fitnessHistory;
    for (let i = 1; i < history.length; i++) {
      expect(history[i].best).toBeGreaterThanOrEqual(history[i - 1].best);
    }
  });

  it('has 20 seeds across varied categories', () => {
    expect(DEMO_SAGE_SEEDS).toHaveLength(20);
    const categories = new Set(DEMO_SAGE_SEEDS.map(s => s.category));
    expect(categories.size).toBeGreaterThanOrEqual(5);
  });

  it('has 10 mutation operators', () => {
    expect(DEMO_SAGE_MUTATIONS).toHaveLength(10);
  });

  it('has 15 quarantine items with mixed statuses', () => {
    expect(DEMO_SAGE_QUARANTINE).toHaveLength(15);
    const statuses = new Set(DEMO_SAGE_QUARANTINE.map(q => q.status));
    expect(statuses).toEqual(new Set(['pending', 'approved', 'rejected']));
  });

  it('quarantine has 5 pending, 6 approved, 4 rejected', () => {
    const pending = DEMO_SAGE_QUARANTINE.filter(q => q.status === 'pending');
    const approved = DEMO_SAGE_QUARANTINE.filter(q => q.status === 'approved');
    const rejected = DEMO_SAGE_QUARANTINE.filter(q => q.status === 'rejected');
    expect(pending).toHaveLength(5);
    expect(approved).toHaveLength(6);
    expect(rejected).toHaveLength(4);
  });
});
