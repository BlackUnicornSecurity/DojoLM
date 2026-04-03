import { describe, it, expect } from 'vitest';
import * as mod from '../supplychain/index.js';

describe('supplychain exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports model verification functions', () => {
    expect(mod.verifyModelHash).toBeTypeOf('function');
    expect(mod.analyzeModelCard).toBeTypeOf('function');
  });

  it('exports dependency auditor functions', () => {
    expect(mod.parseRequirementsTxt).toBeTypeOf('function');
    expect(mod.parsePackageJson).toBeTypeOf('function');
    expect(mod.auditDependencyFile).toBeTypeOf('function');
  });
});
