import { describe, it, expect } from 'vitest';
import * as mod from '../validation/index.js';

describe('validation exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports corpus and generator functions', () => {
    expect(mod.labelFixtures).toBeTypeOf('function');
    expect(mod.analyzeGaps).toBeTypeOf('function');
    expect(mod.expandCorpus).toBeTypeOf('function');
  });

  it('exports runner and integrity functions', () => {
    expect(mod.runValidation).toBeTypeOf('function');
    expect(mod.signHmac).toBeTypeOf('function');
    expect(mod.verifyHmac).toBeTypeOf('function');
    expect(mod.buildMerkleTree).toBeTypeOf('function');
  });
});
