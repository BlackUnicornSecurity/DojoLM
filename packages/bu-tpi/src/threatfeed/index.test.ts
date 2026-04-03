import { describe, it, expect } from 'vitest';
import * as mod from '../threatfeed/index.js';

describe('threatfeed exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports classifier and sanitizer functions', () => {
    expect(mod.classifyThreat).toBeTypeOf('function');
    expect(mod.sanitizeContent).toBeTypeOf('function');
    expect(mod.validateSourceURL).toBeTypeOf('function');
  });

  it('exports pipeline and auto-fixture functions', () => {
    expect(mod.createPipeline).toBeTypeOf('function');
    expect(mod.generateFixtureFromThreat).toBeTypeOf('function');
    expect(mod.createDeduplicator).toBeTypeOf('function');
  });
});
