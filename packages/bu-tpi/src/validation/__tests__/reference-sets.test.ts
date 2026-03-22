/**
 * KATANA Calibration Reference Sets Tests (K4.1)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  selectReferenceSets,
  buildReferenceSetManifest,
  buildSignedReferenceManifest,
  verifyReferenceManifest,
  validateReferenceSet,
} from '../calibration/reference-sets.js';
import { SCHEMA_VERSION, type GroundTruthSample } from '../types.js';
import { CALIBRATION_CONFIG, INTEGRITY_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const TEST_KEY = 'd'.repeat(64);
const originalHmacKey = process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];

beforeEach(() => {
  process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = TEST_KEY;
});

afterEach(() => {
  if (originalHmacKey !== undefined) {
    process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = originalHmacKey;
  } else {
    delete process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];
  }
});

function makeSample(id: string, verdict: 'clean' | 'malicious', modules: string[] = []): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id,
    source_file: `fixtures/test/${id}.txt`,
    content_hash: 'a'.repeat(64),
    content_type: 'text',
    expected_verdict: verdict,
    expected_modules: modules,
    expected_severity: verdict === 'malicious' ? 'CRITICAL' : null,
    expected_categories: verdict === 'malicious' ? ['PROMPT_INJECTION'] : [],
    difficulty: 'moderate',
    source_type: 'synthetic',
    reviewer_1: { id: 'r1', verdict, timestamp: '2026-03-21T00:00:00.000Z' },
    reviewer_2: { id: 'r2', verdict, timestamp: '2026-03-21T00:00:00.000Z' },
    independent_agreement: true,
    holdout: false,
  };
}

function makeCorpus(posPerModule: number, negCount: number, moduleIds: string[]): GroundTruthSample[] {
  const samples: GroundTruthSample[] = [];

  // Clean samples (universal negatives)
  for (let i = 0; i < negCount; i++) {
    samples.push(makeSample(`clean-${i}`, 'clean'));
  }

  // Malicious samples per module
  for (const mod of moduleIds) {
    for (let i = 0; i < posPerModule; i++) {
      samples.push(makeSample(`${mod}-pos-${i}`, 'malicious', [mod]));
    }
  }

  return samples;
}

// ---------------------------------------------------------------------------
// K4.1 — Reference Set Selection
// ---------------------------------------------------------------------------

describe('K4.1 — Reference Set Selection', () => {
  it('selects 10+10 from sufficient corpus', () => {
    const modules = ['enhanced-pi', 'mcp-parser'];
    const corpus = makeCorpus(50, 50, modules);
    const result = selectReferenceSets(corpus, modules, 42);

    expect(result.reference_sets).toHaveLength(2);
    for (const refSet of result.reference_sets) {
      expect(refSet.positive_samples).toHaveLength(CALIBRATION_CONFIG.REFERENCE_POSITIVE);
      expect(refSet.negative_samples).toHaveLength(CALIBRATION_CONFIG.REFERENCE_NEGATIVE);
    }
  });

  it('reports insufficient modules when positive samples < 10', () => {
    const corpus = [
      ...Array.from({ length: 3 }, (_, i) => makeSample(`pi-${i}`, 'malicious', ['enhanced-pi'])),
      ...Array.from({ length: 20 }, (_, i) => makeSample(`clean-${i}`, 'clean')),
    ];
    const result = selectReferenceSets(corpus, ['enhanced-pi'], 42);

    expect(result.stats.modules_insufficient).toBe(1);
    expect(result.stats.insufficient_modules).toContain('enhanced-pi');
    expect(result.reference_sets[0].positive_samples).toHaveLength(3);
  });

  it('reports insufficient when negative samples < 10', () => {
    const corpus = [
      ...Array.from({ length: 20 }, (_, i) => makeSample(`pi-${i}`, 'malicious', ['enhanced-pi'])),
      ...Array.from({ length: 5 }, (_, i) => makeSample(`clean-${i}`, 'clean')),
    ];
    const result = selectReferenceSets(corpus, ['enhanced-pi'], 42);

    expect(result.stats.modules_insufficient).toBe(1);
    expect(result.reference_sets[0].negative_samples).toHaveLength(5);
  });

  it('handles module with zero positive samples', () => {
    const corpus = Array.from({ length: 20 }, (_, i) => makeSample(`clean-${i}`, 'clean'));
    const result = selectReferenceSets(corpus, ['unknown-module'], 42);

    expect(result.reference_sets[0].positive_samples).toHaveLength(0);
    expect(result.stats.insufficient_modules).toContain('unknown-module');
  });

  it('selection is deterministic with same seed', () => {
    const corpus = makeCorpus(100, 100, ['enhanced-pi']);
    const r1 = selectReferenceSets(corpus, ['enhanced-pi'], 42);
    const r2 = selectReferenceSets(corpus, ['enhanced-pi'], 42);

    const ids1 = r1.reference_sets[0].positive_samples.map(s => s.id);
    const ids2 = r2.reference_sets[0].positive_samples.map(s => s.id);
    expect(ids1).toEqual(ids2);
  });

  it('different seeds produce different selections', () => {
    const corpus = makeCorpus(100, 100, ['enhanced-pi']);
    const r1 = selectReferenceSets(corpus, ['enhanced-pi'], 42);
    const r2 = selectReferenceSets(corpus, ['enhanced-pi'], 99);

    const ids1 = new Set(r1.reference_sets[0].positive_samples.map(s => s.id));
    const ids2 = new Set(r2.reference_sets[0].positive_samples.map(s => s.id));

    let diff = 0;
    for (const id of ids1) if (!ids2.has(id)) diff++;
    expect(diff).toBeGreaterThan(0);
  });

  it('reports correct stats', () => {
    const modules = ['mod-a', 'mod-b', 'mod-c'];
    const corpus = makeCorpus(20, 20, modules);
    const result = selectReferenceSets(corpus, modules, 42);

    expect(result.stats.modules_total).toBe(3);
    expect(result.stats.modules_with_reference).toBe(3);
    expect(result.stats.total_reference_samples).toBe(3 * 20); // 3 modules × (10+10)
  });
});

// ---------------------------------------------------------------------------
// K4.1 — Reference Set Manifest
// ---------------------------------------------------------------------------

describe('K4.1 — Reference Set Manifest', () => {
  it('builds manifest from reference set', () => {
    const corpus = makeCorpus(20, 20, ['enhanced-pi']);
    const { reference_sets } = selectReferenceSets(corpus, ['enhanced-pi'], 42);
    const manifest = buildReferenceSetManifest(reference_sets[0]);

    expect(manifest.schema_version).toBe(SCHEMA_VERSION);
    expect(manifest.manifest_type).toBe('calibration');
    expect(manifest.entry_count).toBe(20); // 10+10
    expect(manifest.entries).toHaveLength(20);
  });

  it('signs and verifies reference set manifest', () => {
    const corpus = makeCorpus(20, 20, ['enhanced-pi']);
    const { reference_sets } = selectReferenceSets(corpus, ['enhanced-pi'], 42);
    const signed = buildSignedReferenceManifest(reference_sets[0], TEST_KEY);

    expect(signed.hmac_signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyReferenceManifest(signed, TEST_KEY)).toBe(true);
  });

  it('rejects tampered manifest', () => {
    const corpus = makeCorpus(20, 20, ['enhanced-pi']);
    const { reference_sets } = selectReferenceSets(corpus, ['enhanced-pi'], 42);
    const signed = buildSignedReferenceManifest(reference_sets[0], TEST_KEY);

    const tampered = { ...signed, entry_count: 999 };
    expect(verifyReferenceManifest(tampered, TEST_KEY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// K4.1 — Reference Set Validation
// ---------------------------------------------------------------------------

describe('K4.1 — Reference Set Validation', () => {
  it('validates complete reference set', () => {
    const corpus = makeCorpus(20, 20, ['enhanced-pi']);
    const { reference_sets } = selectReferenceSets(corpus, ['enhanced-pi'], 42);
    const validation = validateReferenceSet(reference_sets[0]);

    expect(validation.valid).toBe(true);
    expect(validation.positive_count).toBe(10);
    expect(validation.negative_count).toBe(10);
  });

  it('rejects incomplete reference set', () => {
    const corpus = makeCorpus(5, 20, ['enhanced-pi']);
    const { reference_sets } = selectReferenceSets(corpus, ['enhanced-pi'], 42);
    const validation = validateReferenceSet(reference_sets[0]);

    expect(validation.valid).toBe(false);
    expect(validation.positive_count).toBe(5);
  });
});
