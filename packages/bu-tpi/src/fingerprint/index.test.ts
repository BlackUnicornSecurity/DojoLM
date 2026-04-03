import { describe, it, expect } from 'vitest';
import * as mod from '../fingerprint/index.js';

describe('fingerprint exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports engine and probe runner classes', () => {
    expect(mod.KagamiEngine).toBeTypeOf('function');
    expect(mod.ProbeRunner).toBeTypeOf('function');
  });

  it('exports signature and probe utilities', () => {
    expect(mod.matchSignatures).toBeTypeOf('function');
    expect(mod.validateSignatures).toBeTypeOf('function');
    expect(mod.loadKagamiSignatures).toBeTypeOf('function');
    expect(mod.ALL_PROBES).toBeDefined();
  });
});
