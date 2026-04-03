/**
 * Tests for Capability Probes
 */

import { describe, it, expect } from 'vitest';
import { CAPABILITY_PROBES } from './capability.js';

describe('CAPABILITY_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(CAPABILITY_PROBES).toBeDefined();
    expect(CAPABILITY_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of CAPABILITY_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('capability');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = CAPABILITY_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the capability-NNN convention', () => {
    for (const probe of CAPABILITY_PROBES) {
      expect(probe.id).toMatch(/^capability-\d+$/);
    }
  });

  it('covers key capability features', () => {
    const features = new Set(CAPABILITY_PROBES.map((p) => p.expectedFeature));
    expect(features.has('code_capability')).toBe(true);
    expect(features.has('web_browsing_claim')).toBe(true);
    expect(features.has('math_capability')).toBe(true);
  });

  it('contains exactly 14 probes', () => {
    expect(CAPABILITY_PROBES).toHaveLength(14);
  });
});
