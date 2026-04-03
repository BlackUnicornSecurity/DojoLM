/**
 * Tests for Tokenizer Probes
 */

import { describe, it, expect } from 'vitest';
import { TOKENIZER_PROBES } from './tokenizer.js';

describe('TOKENIZER_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(TOKENIZER_PROBES).toBeDefined();
    expect(TOKENIZER_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of TOKENIZER_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('tokenizer');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = TOKENIZER_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the tokenizer-NN convention', () => {
    for (const probe of TOKENIZER_PROBES) {
      expect(probe.id).toMatch(/^tokenizer-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(TOKENIZER_PROBES.map((p) => p.expectedFeature));
    expect(features.has('compound_emoji')).toBe(true);
    expect(features.has('rtl_text')).toBe(true);
    expect(features.has('combining_characters')).toBe(true);
    expect(features.has('cjk_characters')).toBe(true);
    expect(features.has('unicode_handling')).toBe(true);
    expect(features.has('special_tokens')).toBe(true);
  });

  it('contains exactly 12 probes', () => {
    expect(TOKENIZER_PROBES).toHaveLength(12);
  });
});
