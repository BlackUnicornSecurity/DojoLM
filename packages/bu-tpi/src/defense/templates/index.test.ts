import { describe, it, expect } from 'vitest';
import * as mod from './index.js';

describe('defense/templates exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports DEFENSE_TEMPLATES array', () => {
    expect(mod.DEFENSE_TEMPLATES).toBeDefined();
    expect(Array.isArray(mod.DEFENSE_TEMPLATES)).toBe(true);
    expect(mod.DEFENSE_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('templates have required fields', () => {
    const first = mod.DEFENSE_TEMPLATES[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('findingCategory');
  });
});
