import { describe, it, expect } from 'vitest';
import * as mod from './index.js';

describe('timechamber/orchestrators exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports orchestrator classes', () => {
    expect(mod.PAIROrchestrator).toBeTypeOf('function');
    expect(mod.CrescendoOrchestrator).toBeTypeOf('function');
    expect(mod.TAPOrchestrator).toBeTypeOf('function');
    expect(mod.SenseiAdaptiveOrchestrator).toBeTypeOf('function');
    expect(mod.MADMAXOrchestrator).toBeTypeOf('function');
  });

  it('exports factory and constants', () => {
    expect(mod.createOrchestrator).toBeTypeOf('function');
    expect(mod.ORCHESTRATOR_TYPES).toBeDefined();
    expect(mod.ESCALATION_STAGES).toBeDefined();
  });
});
