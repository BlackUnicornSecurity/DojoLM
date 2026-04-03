import { describe, it, expect } from 'vitest';
import * as mod from '../shingan/index.js';

describe('shingan exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports skill parser functions', () => {
    expect(mod.detectFormat).toBeTypeOf('function');
    expect(mod.parseSkill).toBeTypeOf('function');
  });

  it('exports pattern arrays and scanner', () => {
    expect(mod.ALL_SHINGAN_PATTERNS).toBeDefined();
    expect(mod.shinganModule).toBeDefined();
    expect(mod.computeTrustScore).toBeTypeOf('function');
    expect(mod.scanSkill).toBeTypeOf('function');
  });
});
