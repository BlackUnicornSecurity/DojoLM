/**
 * Tests for Self-Disclosure Probes
 */

import { describe, it, expect } from 'vitest';
import { SELF_DISCLOSURE_PROBES } from './self-disclosure.js';

describe('SELF_DISCLOSURE_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(SELF_DISCLOSURE_PROBES).toBeDefined();
    expect(SELF_DISCLOSURE_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of SELF_DISCLOSURE_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('self-disclosure');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = SELF_DISCLOSURE_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the self-disclosure-NN convention', () => {
    for (const probe of SELF_DISCLOSURE_PROBES) {
      expect(probe.id).toMatch(/^self-disclosure-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(SELF_DISCLOSURE_PROBES.map((p) => p.expectedFeature));
    expect(features.has('self_identification')).toBe(true);
    expect(features.has('model_version')).toBe(true);
    expect(features.has('developer_identity')).toBe(true);
    expect(features.has('knowledge_cutoff_year')).toBe(true);
    expect(features.has('system_prompt_leakage')).toBe(true);
    expect(features.has('architecture')).toBe(true);
  });

  it('contains exactly 12 probes', () => {
    expect(SELF_DISCLOSURE_PROBES).toHaveLength(12);
  });
});
