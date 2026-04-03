import { describe, it, expect } from 'vitest';
import * as mod from '../detection/index.js';

describe('detection exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports pipeline functions', () => {
    expect(mod.classifyConfidence).toBeTypeOf('function');
    expect(mod.runHybridPipeline).toBeTypeOf('function');
    expect(mod.filterByConfidence).toBeTypeOf('function');
  });

  it('exports config constants', () => {
    expect(mod.CONFIDENCE_LEVELS).toBeDefined();
    expect(mod.DEFAULT_HYBRID_CONFIG).toBeDefined();
  });
});
