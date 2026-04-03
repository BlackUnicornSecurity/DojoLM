/**
 * Tests for Quantization Probes
 */

import { describe, it, expect } from 'vitest';
import { QUANTIZATION_PROBES } from './quantization.js';

describe('QUANTIZATION_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(QUANTIZATION_PROBES).toBeDefined();
    expect(QUANTIZATION_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of QUANTIZATION_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('quantization');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = QUANTIZATION_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the quant-NN convention', () => {
    for (const probe of QUANTIZATION_PROBES) {
      expect(probe.id).toMatch(/^quant-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(QUANTIZATION_PROBES.map((p) => p.expectedFeature));
    expect(features.has('numerical_precision')).toBe(true);
    expect(features.has('repetition_at_length')).toBe(true);
    expect(features.has('reasoning_precision')).toBe(true);
    expect(features.has('token_probability_consistency')).toBe(true);
  });

  it('contains exactly 8 probes', () => {
    expect(QUANTIZATION_PROBES).toHaveLength(8);
  });
});
