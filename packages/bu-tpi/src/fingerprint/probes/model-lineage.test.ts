/**
 * Tests for Model Lineage Probes
 */

import { describe, it, expect } from 'vitest';
import { MODEL_LINEAGE_PROBES } from './model-lineage.js';

describe('MODEL_LINEAGE_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(MODEL_LINEAGE_PROBES).toBeDefined();
    expect(MODEL_LINEAGE_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of MODEL_LINEAGE_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('model-lineage');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = MODEL_LINEAGE_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the lineage-NN convention', () => {
    for (const probe of MODEL_LINEAGE_PROBES) {
      expect(probe.id).toMatch(/^lineage-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(MODEL_LINEAGE_PROBES.map((p) => p.expectedFeature));
    expect(features.has('base_model_similarity')).toBe(true);
    expect(features.has('model_family_cluster')).toBe(true);
    expect(features.has('response_style_fingerprint')).toBe(true);
    expect(features.has('distillation_indicator')).toBe(true);
    expect(features.has('differentiation_awareness')).toBe(true);
    expect(features.has('creative_style_fingerprint')).toBe(true);
  });

  it('contains exactly 10 probes', () => {
    expect(MODEL_LINEAGE_PROBES).toHaveLength(10);
  });
});
