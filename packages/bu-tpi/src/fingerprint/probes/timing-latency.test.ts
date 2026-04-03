/**
 * Tests for Timing & Latency Probes
 */

import { describe, it, expect } from 'vitest';
import { TIMING_LATENCY_PROBES } from './timing-latency.js';

describe('TIMING_LATENCY_PROBES', () => {
  it('exports a non-empty array', () => {
    expect(TIMING_LATENCY_PROBES).toBeDefined();
    expect(TIMING_LATENCY_PROBES.length).toBeGreaterThan(0);
  });

  it('all probes have required ProbeQuery fields', () => {
    for (const probe of TIMING_LATENCY_PROBES) {
      expect(probe.id).toBeTruthy();
      expect(probe.category).toBe('timing-latency');
      expect(probe.prompt).toBeTruthy();
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.weight).toBe('number');
      expect(probe.weight).toBeGreaterThan(0);
    }
  });

  it('all probe IDs are unique', () => {
    const ids = TIMING_LATENCY_PROBES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all probe IDs follow the timing-latency-NN convention', () => {
    for (const probe of TIMING_LATENCY_PROBES) {
      expect(probe.id).toMatch(/^timing-latency-\d+$/);
    }
  });

  it('covers expected feature types', () => {
    const features = new Set(TIMING_LATENCY_PROBES.map((p) => p.expectedFeature));
    expect(features.has('baseline_short_1')).toBe(true);
    expect(features.has('long_context_500w')).toBe(true);
    expect(features.has('streaming_sequential')).toBe(true);
    expect(features.has('time_to_refusal_ms')).toBe(true);
    expect(features.has('concurrent_hint')).toBe(true);
    expect(features.has('cold_start')).toBe(true);
  });

  it('contains exactly 10 probes', () => {
    expect(TIMING_LATENCY_PROBES).toHaveLength(10);
  });
});
