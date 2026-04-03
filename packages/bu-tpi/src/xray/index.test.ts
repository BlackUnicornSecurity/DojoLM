import { describe, it, expect } from 'vitest';
import * as mod from '../xray/index.js';

describe('xray exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports explainer functions', () => {
    expect(mod.explainFinding).toBeTypeOf('function');
    expect(mod.explainFindings).toBeTypeOf('function');
    expect(mod.getAttackPatterns).toBeTypeOf('function');
  });

  it('exports knowledge base functions', () => {
    expect(mod.attackPatterns).toBeDefined();
    expect(mod.getCategories).toBeTypeOf('function');
    expect(mod.getTotalPatternCount).toBeTypeOf('function');
  });
});
