import { describe, it, expect } from 'vitest';
import * as mod from './index.js';

describe('xray/knowledge exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports attack patterns array', () => {
    expect(mod.attackPatterns).toBeDefined();
    expect(Array.isArray(mod.attackPatterns)).toBe(true);
    expect(mod.attackPatterns.length).toBeGreaterThan(0);
  });

  it('exports lookup utilities', () => {
    expect(mod.getCategories).toBeTypeOf('function');
    expect(mod.getCategoryCounts).toBeTypeOf('function');
    expect(mod.getTotalPatternCount).toBeTypeOf('function');
  });
});
