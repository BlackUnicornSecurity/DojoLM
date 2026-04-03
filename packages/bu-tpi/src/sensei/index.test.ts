import { describe, it, expect } from 'vitest';
import * as mod from '../sensei/index.js';

describe('sensei exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports data pipeline and curator functions', () => {
    expect(mod.runExtractionPipeline).toBeTypeOf('function');
    expect(mod.curateSamples).toBeTypeOf('function');
    expect(mod.convertToTrainingFormat).toBeTypeOf('function');
  });

  it('exports API service and attack generator functions', () => {
    expect(mod.executeGenerate).toBeTypeOf('function');
    expect(mod.generateAttacks).toBeTypeOf('function');
    expect(mod.judgeAttack).toBeTypeOf('function');
    expect(mod.probe).toBeTypeOf('function');
  });
});
