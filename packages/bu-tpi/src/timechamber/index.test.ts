import { describe, it, expect } from 'vitest';
import * as mod from '../timechamber/index.js';

describe('timechamber exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports simulator and attack plan functions', () => {
    expect(mod.TimeChamberSimulator).toBeTypeOf('function');
    expect(mod.getAllPlans).toBeTypeOf('function');
    expect(mod.getPlansByType).toBeTypeOf('function');
  });

  it('exports adaptive probe symbols', () => {
    expect(mod.runAdaptiveProbe).toBeTypeOf('function');
    expect(mod.ADAPTIVE_STRATEGIES).toBeDefined();
    expect(mod.TEMPORAL_ATTACK_TYPES).toBeDefined();
  });
});
