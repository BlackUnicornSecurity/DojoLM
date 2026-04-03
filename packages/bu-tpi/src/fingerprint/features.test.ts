/**
 * Tests for fingerprint features
 */

import { describe, it, expect } from 'vitest';
import {
  FEATURE_DIMENSIONS,
  FEATURE_WEIGHTS,
  TIER_1_FEATURES,
  TIER_2_FEATURES,
  TIER_3_FEATURES,
  getFeatureDimensions,
} from './features.js';

describe('FEATURE_DIMENSIONS', () => {
  it('has approximately 45 feature dimensions', () => {
    expect(FEATURE_DIMENSIONS.length).toBeGreaterThanOrEqual(40);
    expect(FEATURE_DIMENSIONS.length).toBeLessThanOrEqual(50);
  });

  it('each dimension has required fields', () => {
    for (const dim of FEATURE_DIMENSIONS) {
      expect(dim.id).toBeTruthy();
      expect(dim.name).toBeTruthy();
      expect(dim.category).toBeTruthy();
      expect(dim.description).toBeTruthy();
      expect(dim.range).toHaveLength(2);
      expect([1, 2, 3]).toContain(dim.tier);
    }
  });

  it('has no duplicate IDs', () => {
    const ids = FEATURE_DIMENSIONS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('FEATURE_WEIGHTS', () => {
  it('has a weight for every feature dimension', () => {
    for (const dim of FEATURE_DIMENSIONS) {
      expect(FEATURE_WEIGHTS[dim.id]).toBeDefined();
      expect(FEATURE_WEIGHTS[dim.id]).toBeGreaterThan(0);
    }
  });

  it('self_identification has highest weight (3)', () => {
    expect(FEATURE_WEIGHTS['self_identification']).toBe(3);
  });
});

describe('Tier subsets', () => {
  it('TIER_1_FEATURES contains only tier 1', () => {
    expect(TIER_1_FEATURES.length).toBeGreaterThan(0);
    for (const f of TIER_1_FEATURES) {
      expect(f.tier).toBe(1);
    }
  });

  it('TIER_2_FEATURES contains only tier 2', () => {
    expect(TIER_2_FEATURES.length).toBeGreaterThan(0);
    for (const f of TIER_2_FEATURES) {
      expect(f.tier).toBe(2);
    }
  });

  it('TIER_3_FEATURES contains only tier 3', () => {
    expect(TIER_3_FEATURES.length).toBeGreaterThan(0);
    for (const f of TIER_3_FEATURES) {
      expect(f.tier).toBe(3);
    }
  });

  it('tier subsets sum to total', () => {
    expect(TIER_1_FEATURES.length + TIER_2_FEATURES.length + TIER_3_FEATURES.length)
      .toBe(FEATURE_DIMENSIONS.length);
  });
});

describe('getFeatureDimensions', () => {
  it('filters by category', () => {
    const watermark = getFeatureDimensions(['watermark']);
    expect(watermark.length).toBeGreaterThan(0);
    for (const f of watermark) {
      expect(f.category).toBe('watermark');
    }
  });

  it('returns empty for unknown category', () => {
    const result = getFeatureDimensions(['unknown-category' as any]);
    expect(result).toHaveLength(0);
  });

  it('handles multiple categories', () => {
    const result = getFeatureDimensions(['watermark', 'capability']);
    expect(result.length).toBeGreaterThan(getFeatureDimensions(['watermark']).length);
  });
});
