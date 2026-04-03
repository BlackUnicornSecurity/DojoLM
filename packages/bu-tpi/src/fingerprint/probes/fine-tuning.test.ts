/**
 * Tests for Fine-Tuning Detection Probes
 */

import { describe, it, expect } from 'vitest';
import { FINE_TUNING_PROBES } from './fine-tuning.js';

describe('FINE_TUNING_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(FINE_TUNING_PROBES).toBeDefined();
    expect(FINE_TUNING_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of FINE_TUNING_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('fine-tuning');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = FINE_TUNING_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the finetune-NN convention', () => {
    for (const probe of FINE_TUNING_PROBES) {
      expect(probe.id).toMatch(/^finetune-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(FINE_TUNING_PROBES.map((p) => p.expectedFeature));
    expect(features.has('safety_alignment_integrity')).toBe(true);
    expect(features.has('instruction_format_sensitivity')).toBe(true);
    expect(features.has('domain_specialization')).toBe(true);
  });

  it('contains exactly 10 probes', () => {
    expect(FINE_TUNING_PROBES).toHaveLength(10);
  });
});
