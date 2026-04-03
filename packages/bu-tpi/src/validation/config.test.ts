/**
 * Tests for validation config constants
 */

import { describe, it, expect } from 'vitest';
import {
  CORPUS_CONFIG,
  VALIDATION_CONFIG,
  CALIBRATION_CONFIG,
  GENERATOR_CONFIG,
  INTEGRITY_CONFIG,
  INVESTIGATION_CONFIG,
  PATHS,
} from './config.js';

describe('CORPUS_CONFIG', () => {
  it('has valid tier minimums', () => {
    expect(CORPUS_CONFIG.TIER_1_MIN_POSITIVE).toBeGreaterThan(0);
    expect(CORPUS_CONFIG.TIER_2_MIN_POSITIVE).toBeGreaterThan(0);
    expect(CORPUS_CONFIG.TIER_3_MIN_POSITIVE).toBeGreaterThan(0);
    expect(CORPUS_CONFIG.TIER_1_MIN_POSITIVE).toBeGreaterThan(CORPUS_CONFIG.TIER_2_MIN_POSITIVE);
  });

  it('holdout percentage is between 0 and 1', () => {
    expect(CORPUS_CONFIG.HOLDOUT_PERCENTAGE).toBeGreaterThan(0);
    expect(CORPUS_CONFIG.HOLDOUT_PERCENTAGE).toBeLessThan(1);
  });

  it('target total samples is a large number', () => {
    expect(CORPUS_CONFIG.TARGET_TOTAL_SAMPLES).toBeGreaterThanOrEqual(100_000);
  });
});

describe('VALIDATION_CONFIG', () => {
  it('repeatability runs are positive', () => {
    expect(VALIDATION_CONFIG.REPEATABILITY_RUNS).toBeGreaterThan(0);
    expect(VALIDATION_CONFIG.NON_DET_REPEATABILITY_RUNS).toBeGreaterThan(VALIDATION_CONFIG.REPEATABILITY_RUNS);
  });

  it('confidence level is 0.95', () => {
    expect(VALIDATION_CONFIG.CONFIDENCE_LEVEL).toBe(0.95);
  });

  it('kappa targets are between 0 and 1', () => {
    expect(VALIDATION_CONFIG.KAPPA_TIER_1).toBeGreaterThan(0);
    expect(VALIDATION_CONFIG.KAPPA_TIER_1).toBeLessThanOrEqual(1);
  });

  it('performance thresholds are ordered correctly', () => {
    expect(VALIDATION_CONFIG.PERF_WARNING_THRESHOLD).toBeLessThan(VALIDATION_CONFIG.PERF_FAILURE_THRESHOLD);
  });
});

describe('GENERATOR_CONFIG', () => {
  it('has valid defaults', () => {
    expect(GENERATOR_CONFIG.DEFAULT_SEED).toBe(42);
    expect(GENERATOR_CONFIG.BATCH_SIZE).toBeGreaterThan(0);
    expect(GENERATOR_CONFIG.RNG_DIVISOR).toBeGreaterThan(0);
  });
});

describe('INTEGRITY_CONFIG', () => {
  it('uses sha256 for HMAC and hash', () => {
    expect(INTEGRITY_CONFIG.HMAC_ALGORITHM).toBe('sha256');
    expect(INTEGRITY_CONFIG.HASH_ALGORITHM).toBe('sha256');
  });

  it('uses ed25519 for signatures', () => {
    expect(INTEGRITY_CONFIG.SIGNATURE_ALGORITHM).toBe('ed25519');
  });
});

describe('PATHS', () => {
  it('all paths are non-empty strings', () => {
    for (const [key, value] of Object.entries(PATHS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('fixtures manifest path includes manifest.json', () => {
    expect(PATHS.FIXTURES_MANIFEST).toContain('manifest.json');
  });
});
