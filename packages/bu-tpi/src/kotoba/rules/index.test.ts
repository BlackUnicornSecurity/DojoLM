import { describe, it, expect } from 'vitest';
import * as mod from './index.js';

describe('kotoba/rules exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports rule arrays', () => {
    expect(mod.BOUNDARY_RULES).toBeDefined();
    expect(mod.PRIORITY_RULES).toBeDefined();
    expect(mod.ROLE_RULES).toBeDefined();
    expect(mod.OUTPUT_RULES).toBeDefined();
    expect(mod.DEFENSE_RULES).toBeDefined();
  });

  it('exports rule utility functions', () => {
    expect(mod.getAllRules).toBeTypeOf('function');
    expect(mod.getRulesByCategory).toBeTypeOf('function');
    expect(mod.getRuleCount).toBeTypeOf('function');
  });
});
