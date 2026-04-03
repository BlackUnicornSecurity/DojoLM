import { describe, it, expect } from 'vitest';
import { CONTEXT_OVERFLOW_PLANS } from './context-overflow.js';

describe('CONTEXT_OVERFLOW_PLANS', () => {
  it('exports a non-empty array', () => {
    expect(CONTEXT_OVERFLOW_PLANS).toBeDefined();
    expect(Array.isArray(CONTEXT_OVERFLOW_PLANS)).toBe(true);
    expect(CONTEXT_OVERFLOW_PLANS.length).toBeGreaterThan(0);
  });

  it('all plans have required ConversationPlan fields', () => {
    for (const plan of CONTEXT_OVERFLOW_PLANS) {
      expect(plan.id).toBeTruthy();
      expect(plan.name).toBeTruthy();
      expect(plan.description).toBeTruthy();
      expect(plan.type).toBe('context_overflow');
      expect(Array.isArray(plan.turns)).toBe(true);
      expect(plan.turns.length).toBeGreaterThan(0);
      expect(typeof plan.maxTurns).toBe('number');
      expect(plan.maxTurns).toBeGreaterThan(0);
      expect(typeof plan.estimatedCost).toBe('number');
      expect(plan.estimatedCost).toBeGreaterThan(0);
    }
  });

  it('all plan IDs are unique', () => {
    const ids = CONTEXT_OVERFLOW_PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all plan IDs follow the co- convention', () => {
    for (const plan of CONTEXT_OVERFLOW_PLANS) {
      expect(plan.id).toMatch(/^co-/);
    }
  });

  it('all turns have required fields', () => {
    for (const plan of CONTEXT_OVERFLOW_PLANS) {
      for (const turn of plan.turns) {
        expect(typeof turn.index).toBe('number');
        expect(['attacker', 'system']).toContain(turn.role);
        expect(typeof turn.content).toBe('string');
        expect(turn.purpose).toBeTruthy();
      }
    }
  });

  it('turns are ordered by index', () => {
    for (const plan of CONTEXT_OVERFLOW_PLANS) {
      for (let i = 1; i < plan.turns.length; i++) {
        expect(plan.turns[i].index).toBeGreaterThan(plan.turns[i - 1].index);
      }
    }
  });

  it('contains exactly 3 plans', () => {
    expect(CONTEXT_OVERFLOW_PLANS).toHaveLength(3);
  });
});
