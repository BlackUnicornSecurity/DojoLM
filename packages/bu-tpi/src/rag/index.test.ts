import { describe, it, expect } from 'vitest';
import * as mod from '../rag/index.js';

describe('rag exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports pipeline simulator functions', () => {
    expect(mod.chunkDocument).toBeTypeOf('function');
    expect(mod.simulateRetrieval).toBeTypeOf('function');
    expect(mod.simulateRagPipeline).toBeTypeOf('function');
  });

  it('exports live pipeline and attack functions', () => {
    expect(mod.buildRagPrompt).toBeTypeOf('function');
    expect(mod.perturbEmbedding).toBeTypeOf('function');
    expect(mod.createPoisonedDocument).toBeTypeOf('function');
    expect(mod.createConflictingFact).toBeTypeOf('function');
  });
});
