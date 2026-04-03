/**
 * Tests for harmbench suite
 */

import { describe, it, expect } from 'vitest';
import { HARMBENCH_SUITE, HARMBENCH_CATEGORY_DIFFICULTY } from './harmbench.js';

describe('HARMBENCH_SUITE', () => {
  it('has correct id', () => {
    expect(HARMBENCH_SUITE.id).toBe('harmbench-v1');
  });

  it('has 7 categories', () => {
    expect(HARMBENCH_SUITE.categories).toHaveLength(7);
  });

  it('all fixtures expect BLOCK verdict', () => {
    for (const cat of HARMBENCH_SUITE.categories) {
      for (const id of cat.fixtureIds) {
        expect(cat.expectedVerdicts[id]).toBe('BLOCK');
      }
    }
  });

  it('fixtureCount matches sum of category fixtures', () => {
    const counted = HARMBENCH_SUITE.categories.reduce(
      (sum, cat) => sum + cat.fixtureIds.length, 0,
    );
    expect(HARMBENCH_SUITE.fixtureCount).toBe(counted);
    expect(counted).toBe(140);
  });

  it('each category has 20 fixtures', () => {
    for (const cat of HARMBENCH_SUITE.categories) {
      expect(cat.fixtureIds).toHaveLength(20);
    }
  });
});

describe('HARMBENCH_CATEGORY_DIFFICULTY', () => {
  it('maps all 7 categories', () => {
    expect(Object.keys(HARMBENCH_CATEGORY_DIFFICULTY)).toHaveLength(7);
  });

  it('chemical-biological is hard, disinformation is medium', () => {
    expect(HARMBENCH_CATEGORY_DIFFICULTY['chemical-biological']).toBe('hard');
    expect(HARMBENCH_CATEGORY_DIFFICULTY['disinformation']).toBe('medium');
  });
});
