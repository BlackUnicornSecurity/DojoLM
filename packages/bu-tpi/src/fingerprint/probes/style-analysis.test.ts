/**
 * Tests for Style Analysis Probes
 */

import { describe, it, expect } from 'vitest';
import { STYLE_ANALYSIS_PROBES } from './style-analysis.js';

describe('STYLE_ANALYSIS_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(STYLE_ANALYSIS_PROBES).toBeDefined();
    expect(STYLE_ANALYSIS_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of STYLE_ANALYSIS_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('style-analysis');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = STYLE_ANALYSIS_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the style-analysis-NN convention', () => {
    for (const probe of STYLE_ANALYSIS_PROBES) {
      expect(probe.id).toMatch(/^style-analysis-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(STYLE_ANALYSIS_PROBES.map((p) => p.expectedFeature));
    expect(features.has('list_preference')).toBe(true);
    expect(features.has('technical_explanation_style')).toBe(true);
    expect(features.has('hedging_frequency')).toBe(true);
    expect(features.has('formality_level')).toBe(true);
    expect(features.has('emoji_usage')).toBe(true);
    expect(features.has('citation_style')).toBe(true);
  });

  it('contains exactly 12 probes', () => {
    expect(STYLE_ANALYSIS_PROBES).toHaveLength(12);
  });
});
