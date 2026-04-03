import { describe, it, expect } from 'vitest';
import * as mod from '../attackdna/index.js';

describe('attackdna exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports lineage engine functions', () => {
    expect(mod.createLineageGraph).toBeTypeOf('function');
    expect(mod.analyzeLineage).toBeTypeOf('function');
    expect(mod.buildFamilies).toBeTypeOf('function');
  });

  it('exports mutation detector and master pipeline functions', () => {
    expect(mod.detectMutations).toBeTypeOf('function');
    expect(mod.syncSource).toBeTypeOf('function');
    expect(mod.syncAllSources).toBeTypeOf('function');
  });
});
