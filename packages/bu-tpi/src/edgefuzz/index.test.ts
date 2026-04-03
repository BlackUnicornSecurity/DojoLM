import { describe, it, expect } from 'vitest';
import * as mod from '../edgefuzz/index.js';

describe('edgefuzz exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports generator functions', () => {
    expect(mod.generateLengthCases).toBeTypeOf('function');
    expect(mod.generateEncodingCases).toBeTypeOf('function');
    expect(mod.generateAllCases).toBeTypeOf('function');
  });

  it('exports edge case types constant', () => {
    expect(mod.EDGE_CASE_TYPES).toBeDefined();
  });
});
