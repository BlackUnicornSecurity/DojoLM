import { describe, it, expect } from 'vitest';
import * as mod from './index.js';

describe('timechamber/attacks exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports attack plan arrays', () => {
    expect(mod.ACCUMULATION_PLANS).toBeDefined();
    expect(mod.DELAYED_ACTIVATION_PLANS).toBeDefined();
    expect(mod.SESSION_PERSISTENCE_PLANS).toBeDefined();
    expect(mod.CONTEXT_OVERFLOW_PLANS).toBeDefined();
    expect(mod.PERSONA_DRIFT_PLANS).toBeDefined();
  });

  it('exports utility functions', () => {
    expect(mod.getAllPlans).toBeTypeOf('function');
    expect(mod.getPlansByType).toBeTypeOf('function');
    expect(mod.getPlanCount).toBeTypeOf('function');
  });
});
