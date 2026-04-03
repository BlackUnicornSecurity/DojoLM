import { describe, it, expect } from 'vitest';
import { PERSONA_DRIFT_PLANS } from './persona-drift.js';

describe('PERSONA_DRIFT_PLANS', () => {
  it('exports a non-empty array', () => {
    expect(PERSONA_DRIFT_PLANS).toBeDefined();
    expect(Array.isArray(PERSONA_DRIFT_PLANS)).toBe(true);
    expect(PERSONA_DRIFT_PLANS.length).toBeGreaterThan(0);
  });

  it('all plans have required ConversationPlan fields', () => {
    for (const plan of PERSONA_DRIFT_PLANS) {
      expect(plan.id).toBeTruthy();
      expect(plan.name).toBeTruthy();
      expect(plan.description).toBeTruthy();
      expect(plan.type).toBe('persona_drift');
      expect(Array.isArray(plan.turns)).toBe(true);
      expect(plan.turns.length).toBeGreaterThan(0);
      expect(typeof plan.maxTurns).toBe('number');
      expect(plan.maxTurns).toBeGreaterThan(0);
      expect(typeof plan.estimatedCost).toBe('number');
      expect(plan.estimatedCost).toBeGreaterThan(0);
    }
  });

  it('all plan IDs are unique', () => {
    const ids = PERSONA_DRIFT_PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all plan IDs follow the pd- convention', () => {
    for (const plan of PERSONA_DRIFT_PLANS) {
      expect(plan.id).toMatch(/^pd-/);
    }
  });

  it('all turns have required fields', () => {
    for (const plan of PERSONA_DRIFT_PLANS) {
      for (const turn of plan.turns) {
        expect(typeof turn.index).toBe('number');
        expect(['attacker', 'system']).toContain(turn.role);
        expect(typeof turn.content).toBe('string');
        expect(turn.purpose).toBeTruthy();
      }
    }
  });

  it('turns are ordered by index', () => {
    for (const plan of PERSONA_DRIFT_PLANS) {
      for (let i = 1; i < plan.turns.length; i++) {
        expect(plan.turns[i].index).toBeGreaterThan(plan.turns[i - 1].index);
      }
    }
  });

  it('contains exactly 4 plans', () => {
    expect(PERSONA_DRIFT_PLANS).toHaveLength(4);
  });
});
