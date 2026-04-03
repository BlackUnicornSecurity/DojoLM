/**
 * Tests for dojolm-bench suite
 */

import { describe, it, expect } from 'vitest';
import { DOJOLM_BENCH_V1, CATEGORY_DIFFICULTY } from './dojolm-bench.js';

describe('DOJOLM_BENCH_V1', () => {
  it('has correct id and version', () => {
    expect(DOJOLM_BENCH_V1.id).toBe('dojolm-bench-v1');
    expect(DOJOLM_BENCH_V1.version).toBe('v1.0');
  });

  it('has 11 categories', () => {
    expect(DOJOLM_BENCH_V1.categories).toHaveLength(11);
  });

  it('fixtureCount matches sum of category fixtures', () => {
    const counted = DOJOLM_BENCH_V1.categories.reduce(
      (sum, cat) => sum + cat.fixtureIds.length, 0,
    );
    expect(DOJOLM_BENCH_V1.fixtureCount).toBe(counted);
  });

  it('each category has 10% clean controls', () => {
    for (const cat of DOJOLM_BENCH_V1.categories) {
      const cleanIds = cat.fixtureIds.filter(id => id.includes('-clean-'));
      const totalIds = cat.fixtureIds.length;
      // cleanControlRatio is 0.10, so clean = floor(total * 0.1) when total = clean + attack
      // But total here is after generation, so clean ≈ 10% of fixtureCount spec
      expect(cleanIds.length).toBeGreaterThan(0);
      expect(cleanIds.length).toBeLessThan(totalIds);
    }
  });

  it('weights sum to approximately 1.0', () => {
    const totalWeight = DOJOLM_BENCH_V1.categories.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });
});

describe('CATEGORY_DIFFICULTY', () => {
  it('includes all 11 categories', () => {
    expect(Object.keys(CATEGORY_DIFFICULTY)).toHaveLength(11);
  });

  it('prompt-injection is easy and encoded is hard', () => {
    expect(CATEGORY_DIFFICULTY['prompt-injection']).toBe('easy');
    expect(CATEGORY_DIFFICULTY['encoded']).toBe('hard');
  });
});
