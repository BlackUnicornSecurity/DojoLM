import { describe, it, expect } from 'vitest';
import * as mod from '../kotoba/index.js';

describe('kotoba exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports scorer functions', () => {
    expect(mod.scorePrompt).toBeTypeOf('function');
    expect(mod.getLetterGrade).toBeTypeOf('function');
  });

  it('exports rules and generator', () => {
    expect(mod.getAllRules).toBeTypeOf('function');
    expect(mod.getRulesByCategory).toBeTypeOf('function');
    expect(mod.generateVariants).toBeTypeOf('function');
    expect(mod.SCORE_CATEGORIES).toBeDefined();
  });
});
