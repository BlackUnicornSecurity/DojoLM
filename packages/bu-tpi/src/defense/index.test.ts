import { describe, it, expect } from 'vitest';
import * as mod from '../defense/index.js';

describe('defense exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports defense templates', () => {
    expect(mod.DEFENSE_TEMPLATES).toBeDefined();
    expect(Array.isArray(mod.DEFENSE_TEMPLATES)).toBe(true);
  });

  it('exports recommender function', () => {
    expect(mod.recommendDefenses).toBeTypeOf('function');
  });
});
