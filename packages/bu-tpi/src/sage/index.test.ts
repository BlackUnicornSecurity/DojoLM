import { describe, it, expect } from 'vitest';
import * as mod from '../sage/index.js';

describe('sage exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports seed library and mutation engine functions', () => {
    expect(mod.extractSeeds).toBeTypeOf('function');
    expect(mod.applyMutation).toBeTypeOf('function');
    expect(mod.applyMutationChain).toBeTypeOf('function');
  });

  it('exports genetic core and safety functions', () => {
    expect(mod.createPopulation).toBeTypeOf('function');
    expect(mod.evolve).toBeTypeOf('function');
    expect(mod.checkContentSafety).toBeTypeOf('function');
    expect(mod.quarantineVariant).toBeTypeOf('function');
  });
});
