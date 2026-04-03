import { describe, it, expect } from 'vitest';
import * as mod from '../agentic/index.js';

describe('agentic exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports environment functions', () => {
    expect(mod.createEnvironment).toBeTypeOf('function');
    expect(mod.executeToolCall).toBeTypeOf('function');
    expect(mod.runToolCalls).toBeTypeOf('function');
  });

  it('exports evaluator and harness adapter functions', () => {
    expect(mod.evaluateUtility).toBeTypeOf('function');
    expect(mod.evaluateScenario).toBeTypeOf('function');
    expect(mod.agenticToolToOpenAIFunction).toBeTypeOf('function');
    expect(mod.convertToolsForHarness).toBeTypeOf('function');
  });
});
