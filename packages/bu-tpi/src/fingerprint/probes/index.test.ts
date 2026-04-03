import { describe, it, expect } from 'vitest';
import * as mod from './index.js';

describe('fingerprint/probes exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports probe arrays', () => {
    expect(mod.SELF_DISCLOSURE_PROBES).toBeDefined();
    expect(mod.CAPABILITY_PROBES).toBeDefined();
    expect(mod.SAFETY_BOUNDARY_PROBES).toBeDefined();
    expect(mod.TOKENIZER_PROBES).toBeDefined();
  });

  it('exports preset utilities', () => {
    expect(mod.ALL_PROBES).toBeDefined();
    expect(mod.PROBE_PRESETS).toBeDefined();
    expect(mod.getProbesForPreset).toBeTypeOf('function');
    expect(mod.getProbesForCategories).toBeTypeOf('function');
  });
});
