import { describe, it, expect } from 'vitest';
import * as mod from '../sengoku/index.js';

describe('sengoku exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports target connector and scheduler', () => {
    expect(mod.validateTargetUrl).toBeTypeOf('function');
    expect(mod.healthCheck).toBeTypeOf('function');
    expect(mod.CampaignScheduler).toBeTypeOf('function');
  });

  it('exports finding tracker and reporter', () => {
    expect(mod.hashFinding).toBeTypeOf('function');
    expect(mod.detectRegressions).toBeTypeOf('function');
    expect(mod.generateReport).toBeTypeOf('function');
  });
});
