/**
 * Tests for Safety Boundary Probes
 */

import { describe, it, expect } from 'vitest';
import { SAFETY_BOUNDARY_PROBES } from './safety-boundary.js';

describe('SAFETY_BOUNDARY_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(SAFETY_BOUNDARY_PROBES).toBeDefined();
    expect(SAFETY_BOUNDARY_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of SAFETY_BOUNDARY_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('safety-boundary');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = SAFETY_BOUNDARY_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the safety-boundary-NN convention', () => {
    for (const probe of SAFETY_BOUNDARY_PROBES) {
      expect(probe.id).toMatch(/^safety-boundary-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(SAFETY_BOUNDARY_PROBES.map((p) => p.expectedFeature));
    expect(features.has('benign_over_refusal')).toBe(true);
    expect(features.has('dual_use_pentest')).toBe(true);
    expect(features.has('security_research_sqli')).toBe(true);
    expect(features.has('role_play_resistance')).toBe(true);
    expect(features.has('refusal_specificity')).toBe(true);
    expect(features.has('recovery_after_refusal')).toBe(true);
  });

  it('contains exactly 14 probes', () => {
    expect(SAFETY_BOUNDARY_PROBES).toHaveLength(14);
  });
});
