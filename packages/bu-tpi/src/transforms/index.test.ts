import { describe, it, expect } from 'vitest';
import * as mod from '../transforms/index.js';

describe('transforms exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports buff constants', () => {
    expect(mod.BUFF_TYPES).toBeDefined();
    expect(mod.ALL_BUFFS).toBeDefined();
  });

  it('exports buff functions', () => {
    expect(mod.applyBuff).toBeTypeOf('function');
    expect(mod.applyBuffChain).toBeTypeOf('function');
    expect(mod.createChain).toBeTypeOf('function');
    expect(mod.base64Buff).toBeDefined();
  });
});
