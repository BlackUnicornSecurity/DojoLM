/**
 * KATANA Holdout Set Separation Tests (K1.6)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  separateHoldout,
  buildHoldoutManifest,
  buildSignedHoldoutManifest,
  buildSignedDevelopmentManifest,
} from '../corpus/holdout-separator.js';
import { verifyManifest } from '../integrity/hmac-signer.js';
import { SCHEMA_VERSION, type GroundTruthSample } from '../types.js';
import { INTEGRITY_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

const TEST_KEY = 'c'.repeat(64);

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

function makeSample(overrides: Partial<GroundTruthSample> = {}): GroundTruthSample {
  const id = overrides.id ?? `gt::test::sample-${Math.random().toString(36).slice(2, 10)}`;
  return {
    schema_version: SCHEMA_VERSION,
    id,
    source_file: `fixtures/test/${id}.txt`,
    content_hash: 'a'.repeat(64),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['enhanced-pi'],
    expected_severity: 'CRITICAL',
    expected_categories: ['PROMPT_INJECTION'],
    difficulty: 'moderate',
    source_type: 'synthetic',
    reviewer_1: { id: 'r1', verdict: 'malicious', timestamp: '2026-03-21T00:00:00.000Z' },
    reviewer_2: { id: 'r2', verdict: 'malicious', timestamp: '2026-03-21T00:00:00.000Z' },
    independent_agreement: true,
    holdout: false,
    ...overrides,
  };
}

function makeSamples(count: number, verdict: 'clean' | 'malicious' = 'malicious', difficulty: 'trivial' | 'moderate' | 'advanced' = 'moderate'): GroundTruthSample[] {
  return Array.from({ length: count }, (_, i) =>
    makeSample({
      id: `gt::${verdict}::${difficulty}-${i}`,
      expected_verdict: verdict,
      expected_modules: verdict === 'clean' ? [] : ['enhanced-pi'],
      expected_severity: verdict === 'clean' ? null : 'CRITICAL',
      expected_categories: verdict === 'clean' ? [] : ['PROMPT_INJECTION'],
      difficulty,
    }),
  );
}

// ---------------------------------------------------------------------------
// K1.6 — Basic Separation
// ---------------------------------------------------------------------------

describe('K1.6 — Holdout Set Separation', () => {
  it('separates empty corpus', () => {
    const result = separateHoldout([], 42);
    expect(result.development).toHaveLength(0);
    expect(result.holdout).toHaveLength(0);
    expect(result.stats.total_samples).toBe(0);
  });

  it('separates 100 samples with ~20% holdout', () => {
    const samples = makeSamples(100);
    const result = separateHoldout(samples, 42);

    expect(result.development.length + result.holdout.length).toBe(100);
    // 20% of 100 = 20
    expect(result.holdout.length).toBe(20);
    expect(result.development.length).toBe(80);
    expect(result.stats.holdout_percentage).toBeCloseTo(0.20, 1);
  });

  it('marks holdout samples with holdout: true', () => {
    const samples = makeSamples(50);
    const result = separateHoldout(samples, 42);

    for (const s of result.holdout) {
      expect(s.holdout).toBe(true);
    }
    for (const s of result.development) {
      expect(s.holdout).toBe(false);
    }
  });

  it('does not mutate original samples', () => {
    const samples = makeSamples(20);
    const originalHoldoutValues = samples.map(s => s.holdout);
    separateHoldout(samples, 42);
    // Original samples unchanged
    for (let i = 0; i < samples.length; i++) {
      expect(samples[i].holdout).toBe(originalHoldoutValues[i]);
    }
  });

  it('no duplicate samples across sets', () => {
    const samples = makeSamples(100);
    const result = separateHoldout(samples, 42);

    const devIds = new Set(result.development.map(s => s.id));
    const holdoutIds = new Set(result.holdout.map(s => s.id));

    expect(devIds.size).toBe(result.development.length);
    expect(holdoutIds.size).toBe(result.holdout.length);

    for (const id of holdoutIds) {
      expect(devIds.has(id)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// K1.6 — Stratified Selection
// ---------------------------------------------------------------------------

describe('K1.6 — Stratified Selection', () => {
  it('preserves proportional representation across verdicts', () => {
    const clean = makeSamples(50, 'clean', 'trivial');
    const malicious = makeSamples(50, 'malicious', 'moderate');
    const samples = [...clean, ...malicious];

    const result = separateHoldout(samples, 42);

    const holdoutClean = result.holdout.filter(s => s.expected_verdict === 'clean').length;
    const holdoutMalicious = result.holdout.filter(s => s.expected_verdict === 'malicious').length;

    // Both verdicts should be represented in holdout
    expect(holdoutClean).toBeGreaterThan(0);
    expect(holdoutMalicious).toBeGreaterThan(0);

    // Each stratum should have ~20% holdout
    expect(holdoutClean).toBe(10); // 20% of 50
    expect(holdoutMalicious).toBe(10); // 20% of 50
  });

  it('preserves proportional representation across difficulties', () => {
    const trivial = makeSamples(30, 'malicious', 'trivial');
    const moderate = makeSamples(30, 'malicious', 'moderate');
    const advanced = makeSamples(30, 'malicious', 'advanced');
    const samples = [...trivial, ...moderate, ...advanced];

    const result = separateHoldout(samples, 42);

    const holdoutByDifficulty = new Map<string, number>();
    for (const s of result.holdout) {
      holdoutByDifficulty.set(s.difficulty, (holdoutByDifficulty.get(s.difficulty) ?? 0) + 1);
    }

    // Each difficulty should have ~6 holdout samples (20% of 30)
    expect(holdoutByDifficulty.get('trivial')).toBe(6);
    expect(holdoutByDifficulty.get('moderate')).toBe(6);
    expect(holdoutByDifficulty.get('advanced')).toBe(6);
  });

  it('ensures at least 1 holdout for small strata (2+ samples)', () => {
    const samples = makeSamples(3, 'malicious', 'advanced');
    const result = separateHoldout(samples, 42);

    // 20% of 3 = 0.6, rounds to 1
    expect(result.holdout.length).toBeGreaterThanOrEqual(1);
  });

  it('handles single-sample stratum (no holdout)', () => {
    const sample = makeSample({ difficulty: 'evasive', expected_verdict: 'malicious' });
    const result = separateHoldout([sample], 42);

    // Can't hold out from single sample
    expect(result.holdout.length + result.development.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// K1.6 — Determinism
// ---------------------------------------------------------------------------

describe('K1.6 — Deterministic Separation', () => {
  it('same seed produces same split', () => {
    const samples = makeSamples(100);
    const result1 = separateHoldout(samples, 42);
    const result2 = separateHoldout(samples, 42);

    const ids1 = result1.holdout.map(s => s.id);
    const ids2 = result2.holdout.map(s => s.id);
    expect(ids1).toEqual(ids2);
  });

  it('different seeds produce different splits', () => {
    const samples = makeSamples(100);
    const result1 = separateHoldout(samples, 42);
    const result2 = separateHoldout(samples, 99);

    const ids1 = new Set(result1.holdout.map(s => s.id));
    const ids2 = new Set(result2.holdout.map(s => s.id));

    // At least some samples should differ
    let differences = 0;
    for (const id of ids1) {
      if (!ids2.has(id)) differences++;
    }
    expect(differences).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// K1.6 — Validation
// ---------------------------------------------------------------------------

describe('K1.6 — Input Validation', () => {
  it('throws on holdoutPercentage <= 0', () => {
    expect(() => separateHoldout(makeSamples(10), 42, 0)).toThrow('must be in (0, 1)');
  });

  it('throws on holdoutPercentage >= 1', () => {
    expect(() => separateHoldout(makeSamples(10), 42, 1.0)).toThrow('must be in (0, 1)');
  });

  it('throws on negative holdoutPercentage', () => {
    expect(() => separateHoldout(makeSamples(10), 42, -0.1)).toThrow('must be in (0, 1)');
  });
});

// ---------------------------------------------------------------------------
// K1.6 — Statistics
// ---------------------------------------------------------------------------

describe('K1.6 — Separation Statistics', () => {
  it('reports correct aggregate stats', () => {
    const samples = makeSamples(50);
    const result = separateHoldout(samples, 42);

    expect(result.stats.total_samples).toBe(50);
    expect(result.stats.development_count + result.stats.holdout_count).toBe(50);
    expect(result.stats.per_stratum.length).toBeGreaterThan(0);
  });

  it('per-stratum stats sum to total', () => {
    const clean = makeSamples(30, 'clean', 'trivial');
    const mal = makeSamples(70, 'malicious', 'moderate');
    const result = separateHoldout([...clean, ...mal], 42);

    let stratumTotal = 0;
    let stratumHoldout = 0;
    for (const s of result.stats.per_stratum) {
      stratumTotal += s.total;
      stratumHoldout += s.holdout;
    }
    expect(stratumTotal).toBe(100);
    expect(stratumHoldout).toBe(result.stats.holdout_count);
  });
});

// ---------------------------------------------------------------------------
// K1.6 — Manifest Building
// ---------------------------------------------------------------------------

describe('K1.6 — Holdout Manifest', () => {
  it('builds holdout manifest', () => {
    const samples = makeSamples(10);
    const { holdout } = separateHoldout(samples, 42);
    const manifest = buildHoldoutManifest(holdout);

    expect(manifest.schema_version).toBe(SCHEMA_VERSION);
    expect(manifest.manifest_type).toBe('holdout');
    expect(manifest.entry_count).toBe(holdout.length);
    expect(manifest.entries).toHaveLength(holdout.length);
  });

  it('builds and signs holdout manifest', () => {
    const samples = makeSamples(10);
    const { holdout } = separateHoldout(samples, 42);
    const signed = buildSignedHoldoutManifest(holdout, TEST_KEY);

    expect(signed.hmac_signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyManifest(signed, TEST_KEY)).toBe(true);
  });

  it('builds and signs development manifest', () => {
    const samples = makeSamples(10);
    const { development } = separateHoldout(samples, 42);
    const signed = buildSignedDevelopmentManifest(development, TEST_KEY);

    expect(signed.manifest_type).toBe('ground-truth');
    expect(signed.hmac_signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyManifest(signed, TEST_KEY)).toBe(true);
  });

  it('rejects tampered manifest', () => {
    const samples = makeSamples(10);
    const { holdout } = separateHoldout(samples, 42);
    const signed = buildSignedHoldoutManifest(holdout, TEST_KEY);

    // Tamper with entry count
    const tampered = { ...signed, entry_count: 999 };
    expect(verifyManifest(tampered, TEST_KEY)).toBe(false);
  });
});
