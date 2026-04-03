/**
 * Tests for Parameter Sensitivity Probes
 */

import { describe, it, expect } from 'vitest';
import { PARAMETER_SENSITIVITY_PROBES } from './parameter-sensitivity.js';

describe('PARAMETER_SENSITIVITY_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(PARAMETER_SENSITIVITY_PROBES).toBeDefined();
    expect(PARAMETER_SENSITIVITY_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of PARAMETER_SENSITIVITY_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('parameter-sensitivity');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = PARAMETER_SENSITIVITY_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the parameter-sensitivity-NN convention', () => {
    for (const probe of PARAMETER_SENSITIVITY_PROBES) {
      expect(probe.id).toMatch(/^parameter-sensitivity-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(PARAMETER_SENSITIVITY_PROBES.map((p) => p.expectedFeature));
    expect(features.has('temperature_determinism_low')).toBe(true);
    expect(features.has('creativity_variation_low')).toBe(true);
    expect(features.has('top_p_narrow')).toBe(true);
    expect(features.has('max_tokens_short')).toBe(true);
  });

  it('contains exactly 10 probes', () => {
    expect(PARAMETER_SENSITIVITY_PROBES).toHaveLength(10);
  });
});
