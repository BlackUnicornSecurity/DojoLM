/**
 * Tests for Censorship Probes
 */

import { describe, it, expect } from 'vitest';
import { CENSORSHIP_PROBES } from './censorship.js';

describe('CENSORSHIP_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(CENSORSHIP_PROBES).toBeDefined();
    expect(CENSORSHIP_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of CENSORSHIP_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('censorship');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = CENSORSHIP_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the censor-NN convention', () => {
    for (const probe of CENSORSHIP_PROBES) {
      expect(probe.id).toMatch(/^censor-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(CENSORSHIP_PROBES.map((p) => p.expectedFeature));
    expect(features.has('censorship_pattern')).toBe(true);
    expect(features.has('political_sensitivity')).toBe(true);
    expect(features.has('cultural_sensitivity')).toBe(true);
  });

  it('contains exactly 14 probes', () => {
    expect(CENSORSHIP_PROBES).toHaveLength(14);
  });
});
