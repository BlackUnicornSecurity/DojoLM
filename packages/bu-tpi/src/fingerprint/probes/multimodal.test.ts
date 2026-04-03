/**
 * Tests for Multimodal Probes
 */

import { describe, it, expect } from 'vitest';
import { MULTIMODAL_PROBES } from './multimodal.js';

describe('MULTIMODAL_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(MULTIMODAL_PROBES).toBeDefined();
    expect(MULTIMODAL_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of MULTIMODAL_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('multimodal');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = MULTIMODAL_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the multimodal-NN convention', () => {
    for (const probe of MULTIMODAL_PROBES) {
      expect(probe.id).toMatch(/^multimodal-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(MULTIMODAL_PROBES.map((p) => p.expectedFeature));
    expect(features.has('multimodal_quality_score')).toBe(true);
    expect(features.has('code_quality_fingerprint')).toBe(true);
    expect(features.has('structured_output_fidelity')).toBe(true);
    expect(features.has('audio_capability')).toBe(true);
    expect(features.has('visual_reasoning')).toBe(true);
    expect(features.has('cross_format_consistency')).toBe(true);
  });

  it('contains exactly 10 probes', () => {
    expect(MULTIMODAL_PROBES).toHaveLength(10);
  });
});
