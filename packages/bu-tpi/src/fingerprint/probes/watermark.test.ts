/**
 * Tests for watermark probes
 */

import { describe, it, expect } from 'vitest';
import { WATERMARK_PROBES } from './watermark.js';

describe('WATERMARK_PROBES', () => {
  it('has 10 probes', () => {
    expect(WATERMARK_PROBES).toHaveLength(10);
  });

  it('all probes have watermark category', () => {
    for (const probe of WATERMARK_PROBES) {
      expect(probe.category).toBe('watermark');
    }
  });

  it('all probes have unique IDs', () => {
    const ids = WATERMARK_PROBES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('probes have sequential IDs from watermark-01 to watermark-10', () => {
    for (let i = 0; i < WATERMARK_PROBES.length; i++) {
      expect(WATERMARK_PROBES[i].id).toBe(`watermark-${String(i + 1).padStart(2, '0')}`);
    }
  });

  it('each probe has a non-empty prompt', () => {
    for (const probe of WATERMARK_PROBES) {
      expect(probe.prompt.length).toBeGreaterThan(10);
    }
  });

  it('probes cover green_ratio, entropy_bias, robustness, and reproducibility features', () => {
    const features = new Set(WATERMARK_PROBES.map(p => p.expectedFeature));
    expect(features.has('watermark_green_ratio')).toBe(true);
    expect(features.has('watermark_entropy_bias')).toBe(true);
  });
});
