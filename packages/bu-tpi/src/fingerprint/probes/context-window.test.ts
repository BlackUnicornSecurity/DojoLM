/**
 * Tests for Context Window Probes
 */

import { describe, it, expect } from 'vitest';
import { CONTEXT_WINDOW_PROBES } from './context-window.js';

describe('CONTEXT_WINDOW_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(CONTEXT_WINDOW_PROBES).toBeDefined();
    expect(CONTEXT_WINDOW_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of CONTEXT_WINDOW_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('context-window');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = CONTEXT_WINDOW_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the ctx-win-NN convention', () => {
    for (const probe of CONTEXT_WINDOW_PROBES) {
      expect(probe.id).toMatch(/^ctx-win-\d+$/);
    }
  });

  it('some probes include systemMessage for padding', () => {
    const withSystem = CONTEXT_WINDOW_PROBES.filter((p) => p.systemMessage);
    expect(withSystem.length).toBeGreaterThan(0);
  });

  it('covers expected feature types', () => {
    const features = new Set(CONTEXT_WINDOW_PROBES.map((p) => p.expectedFeature));
    expect(features.has('context_window_degradation')).toBe(true);
    expect(features.has('lost_in_middle_score')).toBe(true);
    expect(features.has('context_self_report')).toBe(true);
  });
});
