/**
 * File: probe-validation.test.ts
 * Purpose: Validates ALL OBL probe arrays are well-formed with valid ProbeQuery fields
 * Epic: OBLITERATUS (OBL) — T0.3
 *
 * Assertions are added as probe files land in subsequent tasks.
 * Each describe block validates a specific probe array for:
 * - Non-empty array
 * - Required ProbeQuery fields (id, category, prompt, expectedFeature, weight)
 * - Valid ProbeCategory values
 * - No duplicate IDs
 */

import { describe, it, expect } from 'vitest';
import type { ProbeCategory, ProbeQuery } from '../fingerprint/types.js';

const VALID_CATEGORIES: readonly ProbeCategory[] = [
  'self-disclosure', 'capability', 'knowledge-boundary', 'safety-boundary',
  'style-analysis', 'parameter-sensitivity', 'timing-latency', 'tokenizer',
  'multi-turn', 'censorship', 'api-metadata', 'watermark', 'multimodal',
  'context-window', 'fine-tuning', 'quantization', 'model-lineage',
];

/**
 * Validate a probe array has correct structure.
 * Call at top level inside a `describe` block — uses `it()` internally.
 */
function validateProbeArray(probes: readonly ProbeQuery[], label: string) {
  it(`${label}: is non-empty`, () => {
    expect(probes.length).toBeGreaterThan(0);
  });

  it(`${label}: all entries have required ProbeQuery fields`, () => {
    for (const probe of probes) {
      expect(probe.id).toBeTruthy();
      expect(typeof probe.id).toBe('string');
      expect(probe.category).toBeTruthy();
      expect(probe.prompt).toBeTruthy();
      expect(typeof probe.prompt).toBe('string');
      expect(probe.expectedFeature).toBeTruthy();
      expect(typeof probe.expectedFeature).toBe('string');
      expect(typeof probe.weight).toBe('number');
    }
  });

  it(`${label}: all entries have valid ProbeCategory`, () => {
    for (const probe of probes) {
      expect(VALID_CATEGORIES).toContain(probe.category);
    }
  });

  it(`${label}: no duplicate IDs`, () => {
    const ids = probes.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
}

// Probe arrays will be imported and validated as they are created:
// - T1.1: ALIGNMENT_PROBES
// - T3.1: BASELINE_PROBES, RECOVERY_PROBES
// - T4.1: GEOMETRY_PROBES
// - T4.2: CONTRASTIVE_PAIRS (as ProbeQuery[])
// - T5.1: DEPTH_PROBES

describe('OBL Probe Validation — Skeleton', () => {
  // Validate the helper itself with a mock probe
  const mockProbes: readonly ProbeQuery[] = [
    { id: 'test-01', category: 'safety-boundary', prompt: 'test prompt', expectedFeature: 'test-feature', weight: 1 },
  ];
  validateProbeArray(mockProbes, 'skeleton-mock');
});

// Export for reuse in per-module test files
export { validateProbeArray, VALID_CATEGORIES };
