import { describe, it, expect } from 'vitest';
import * as mod from '../compliance/index.js';

describe('compliance exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports frameworks', () => {
    expect(mod.ALL_FRAMEWORKS).toBeDefined();
    expect(mod.OWASP_LLM_TOP10).toBeDefined();
    expect(mod.NIST_AI_600_1).toBeDefined();
  });

  it('exports mapper, report, and evidence functions', () => {
    expect(mod.mapModuleToControls).toBeTypeOf('function');
    expect(mod.generateFullReport).toBeTypeOf('function');
    expect(mod.verifyModelIntegrity).toBeTypeOf('function');
  });
});
