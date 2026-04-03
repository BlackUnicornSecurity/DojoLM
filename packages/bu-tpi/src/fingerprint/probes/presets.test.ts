/**
 * Tests for Probe Presets & Barrel Aggregation
 */

import { describe, it, expect } from 'vitest';
import { ALL_PROBES, PROBE_PRESETS, getProbesForPreset, getProbesForCategories } from './presets.js';

describe('ALL_PROBES', () => {
  it('exports a Map with all 17 probe categories', () => {
    expect(ALL_PROBES).toBeDefined();
    expect(ALL_PROBES).toBeInstanceOf(Map);
    expect(ALL_PROBES.size).toBe(17);
  });

  it('every category maps to a non-empty probe array', () => {
    for (const [category, probes] of ALL_PROBES) {
      expect(category).toBeTruthy();
      expect(Array.isArray(probes)).toBe(true);
      expect(probes.length).toBeGreaterThan(0);
    }
  });

  it('contains the expected category keys', () => {
    const expectedCategories = [
      'self-disclosure',
      'capability',
      'knowledge-boundary',
      'safety-boundary',
      'style-analysis',
      'parameter-sensitivity',
      'timing-latency',
      'tokenizer',
      'multi-turn',
      'censorship',
      'api-metadata',
      'watermark',
      'multimodal',
      'context-window',
      'fine-tuning',
      'quantization',
      'model-lineage',
    ];
    for (const cat of expectedCategories) {
      expect(ALL_PROBES.has(cat as never)).toBe(true);
    }
  });
});

describe('PROBE_PRESETS', () => {
  it('exports 5 preset configurations', () => {
    expect(PROBE_PRESETS).toBeDefined();
    expect(PROBE_PRESETS).toHaveLength(5);
  });

  it('all presets have required fields', () => {
    for (const preset of PROBE_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(Array.isArray(preset.categories)).toBe(true);
      expect(preset.categories.length).toBeGreaterThan(0);
      expect(typeof preset.estimatedProbes).toBe('number');
      expect(preset.estimatedProbes).toBeGreaterThan(0);
    }
  });

  it('all preset names are unique', () => {
    const names = PROBE_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('contains the expected preset names', () => {
    const names = new Set(PROBE_PRESETS.map((p) => p.name));
    expect(names.has('quick')).toBe(true);
    expect(names.has('standard')).toBe(true);
    expect(names.has('full')).toBe(true);
    expect(names.has('verify')).toBe(true);
    expect(names.has('stealth')).toBe(true);
  });

  it('all preset categories reference valid ALL_PROBES keys', () => {
    for (const preset of PROBE_PRESETS) {
      for (const category of preset.categories) {
        expect(ALL_PROBES.has(category)).toBe(true);
      }
    }
  });
});

describe('getProbesForPreset', () => {
  it('returns probes for each valid preset name', () => {
    for (const preset of PROBE_PRESETS) {
      const probes = getProbesForPreset(preset.name);
      expect(probes.length).toBeGreaterThan(0);
    }
  });

  it('throws for an unknown preset name', () => {
    expect(() => getProbesForPreset('nonexistent' as never)).toThrow('Unknown probe preset');
  });
});

describe('getProbesForCategories', () => {
  it('returns probes for a single category', () => {
    const probes = getProbesForCategories(['censorship']);
    expect(probes.length).toBeGreaterThan(0);
    for (const probe of probes) {
      expect(probe.category).toBe('censorship');
    }
  });

  it('returns combined probes for multiple categories', () => {
    const probes = getProbesForCategories(['censorship', 'self-disclosure']);
    const categories = new Set(probes.map((p) => p.category));
    expect(categories.has('censorship')).toBe(true);
    expect(categories.has('self-disclosure')).toBe(true);
  });

  it('returns empty array for empty category list', () => {
    const probes = getProbesForCategories([]);
    expect(probes).toHaveLength(0);
  });
});
