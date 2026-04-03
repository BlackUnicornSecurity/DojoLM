/**
 * Tests for Multi-Turn Probes
 */

import { describe, it, expect } from 'vitest';
import { MULTI_TURN_PROBES } from './multi-turn.js';

describe('MULTI_TURN_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(MULTI_TURN_PROBES).toBeDefined();
    expect(MULTI_TURN_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of MULTI_TURN_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('multi-turn');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = MULTI_TURN_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the multi-turn-NN convention', () => {
    for (const probe of MULTI_TURN_PROBES) {
      expect(probe.id).toMatch(/^multi-turn-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(MULTI_TURN_PROBES.map((p) => p.expectedFeature));
    expect(features.has('multi_turn_recall_depth')).toBe(true);
    expect(features.has('memory_recall_depth_5')).toBe(true);
    expect(features.has('instruction_persistence_depth_3')).toBe(true);
    expect(features.has('contradiction_handling')).toBe(true);
    expect(features.has('context_fill_2k')).toBe(true);
    expect(features.has('persona_stability')).toBe(true);
  });

  it('contains exactly 12 probes', () => {
    expect(MULTI_TURN_PROBES).toHaveLength(12);
  });
});
