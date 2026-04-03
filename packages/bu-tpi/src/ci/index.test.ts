import { describe, it, expect } from 'vitest';
import * as mod from '../ci/index.js';

describe('ci exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports SARIF reporter functions', () => {
    expect(mod.extractRules).toBeTypeOf('function');
    expect(mod.findingsToSarifResults).toBeTypeOf('function');
    expect(mod.generateSarifReport).toBeTypeOf('function');
  });

  it('exports JUnit reporter', () => {
    expect(mod.generateJUnitReport).toBeTypeOf('function');
  });
});
