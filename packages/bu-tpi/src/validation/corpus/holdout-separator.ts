/**
 * KATANA Holdout Set Separation (K1.6)
 *
 * Reserves 20% of ground-truth corpus as blind holdout set.
 * Uses stratified random selection: 20% per module per category per difficulty.
 *
 * Holdout set NEVER used during development, debugging, or threshold tuning.
 * Only run during formal validation sessions.
 *
 * ISO 17025 Clause 7.2.2
 */

import { CORPUS_CONFIG, PATHS } from '../config.js';
import { SCHEMA_VERSION, type GroundTruthSample, type Manifest } from '../types.js';
import { SeededRNG } from '../generators/generator-registry.js';
import { signManifest } from '../integrity/hmac-signer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HoldoutSeparationResult {
  /** Samples retained for development/training */
  readonly development: readonly GroundTruthSample[];
  /** Samples reserved as blind holdout */
  readonly holdout: readonly GroundTruthSample[];
  /** Statistics about the separation */
  readonly stats: HoldoutStats;
}

export interface HoldoutStats {
  readonly total_samples: number;
  readonly development_count: number;
  readonly holdout_count: number;
  readonly holdout_percentage: number;
  readonly per_stratum: readonly StratumStats[];
}

export interface StratumStats {
  readonly stratum_key: string;
  readonly total: number;
  readonly holdout: number;
  readonly development: number;
}

// ---------------------------------------------------------------------------
// Stratified Separation
// ---------------------------------------------------------------------------

/**
 * Separate ground truth corpus into development and holdout sets.
 *
 * Stratification keys: module × verdict × difficulty
 * This ensures proportional representation in the holdout set.
 *
 * @param samples - All ground truth samples
 * @param seed - RNG seed for reproducible separation (default: 12345)
 * @param holdoutPercentage - Fraction to hold out (default: 0.20)
 * @returns Development and holdout sample arrays
 */
export function separateHoldout(
  samples: readonly GroundTruthSample[],
  seed: number,
  holdoutPercentage: number = CORPUS_CONFIG.HOLDOUT_PERCENTAGE,
): HoldoutSeparationResult {
  if (samples.length === 0) {
    return {
      development: [],
      holdout: [],
      stats: {
        total_samples: 0,
        development_count: 0,
        holdout_count: 0,
        holdout_percentage: 0,
        per_stratum: [],
      },
    };
  }

  if (holdoutPercentage <= 0 || holdoutPercentage >= 1) {
    throw new Error(
      `holdoutPercentage must be in (0, 1), got ${holdoutPercentage}`,
    );
  }

  const rng = new SeededRNG(seed);

  // Group samples into strata
  const strata = stratifySamples(samples);

  const development: GroundTruthSample[] = [];
  const holdout: GroundTruthSample[] = [];
  const perStratum: StratumStats[] = [];

  for (const [stratumKey, stratumSamples] of strata.entries()) {
    // Shuffle deterministically within stratum
    const shuffled = fisherYatesShuffle(stratumSamples, rng);

    // Compute holdout count — at least 1 if stratum has 2+ samples
    const holdoutCount = Math.max(
      stratumSamples.length >= 2 ? 1 : 0,
      Math.round(stratumSamples.length * holdoutPercentage),
    );

    const stratumHoldout = shuffled.slice(0, holdoutCount);
    const stratumDev = shuffled.slice(holdoutCount);

    // Mark holdout flag on samples (immutable — create new objects)
    for (const sample of stratumHoldout) {
      holdout.push({ ...sample, holdout: true });
    }
    for (const sample of stratumDev) {
      development.push({ ...sample, holdout: false });
    }

    perStratum.push({
      stratum_key: stratumKey,
      total: stratumSamples.length,
      holdout: holdoutCount,
      development: stratumSamples.length - holdoutCount,
    });
  }

  return {
    development,
    holdout,
    stats: {
      total_samples: samples.length,
      development_count: development.length,
      holdout_count: holdout.length,
      holdout_percentage: holdout.length / samples.length,
      per_stratum: perStratum,
    },
  };
}

// ---------------------------------------------------------------------------
// Stratification
// ---------------------------------------------------------------------------

/**
 * Group samples by stratification key: verdict × difficulty.
 *
 * We use verdict and difficulty (not module) because:
 * - A single sample may map to multiple modules (many-to-many)
 * - Verdict × difficulty gives clean separation without duplication
 */
function stratifySamples(
  samples: readonly GroundTruthSample[],
): Map<string, GroundTruthSample[]> {
  const strata = new Map<string, GroundTruthSample[]>();

  for (const sample of samples) {
    const key = `${sample.expected_verdict}::${sample.difficulty}`;
    const existing = strata.get(key);
    if (existing) {
      existing.push(sample);
    } else {
      strata.set(key, [sample]);
    }
  }

  return strata;
}

// ---------------------------------------------------------------------------
// Fisher-Yates Shuffle (deterministic with SeededRNG)
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates shuffle using SeededRNG for determinism.
 * Creates a copy — does not mutate the input array.
 */
function fisherYatesShuffle<T>(input: readonly T[], rng: SeededRNG): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Manifest Building
// ---------------------------------------------------------------------------

/**
 * Build a holdout manifest from holdout samples.
 * Separate from development manifest — HMAC-signed independently.
 */
export function buildHoldoutManifest(
  holdoutSamples: readonly GroundTruthSample[],
): Manifest {
  return {
    schema_version: SCHEMA_VERSION,
    manifest_type: 'holdout',
    generated_at: new Date().toISOString(),
    entry_count: holdoutSamples.length,
    entries: holdoutSamples.map(s => ({
      id: s.id,
      file_path: s.source_file,
      content_hash: s.content_hash,
    })),
  };
}

/**
 * Build and HMAC-sign a holdout manifest.
 *
 * @param holdoutSamples - Holdout samples
 * @param key - HMAC key (if omitted, reads from env var)
 * @returns Signed holdout manifest
 */
export function buildSignedHoldoutManifest(
  holdoutSamples: readonly GroundTruthSample[],
  key?: string,
): Manifest {
  const manifest = buildHoldoutManifest(holdoutSamples);
  return signManifest(manifest, key);
}

/**
 * Build and HMAC-sign a development manifest (non-holdout samples).
 *
 * @param devSamples - Development samples
 * @param key - HMAC key (if omitted, reads from env var)
 * @returns Signed development manifest
 */
export function buildSignedDevelopmentManifest(
  devSamples: readonly GroundTruthSample[],
  key?: string,
): Manifest {
  const manifest: Manifest = {
    schema_version: SCHEMA_VERSION,
    manifest_type: 'ground-truth',
    generated_at: new Date().toISOString(),
    entry_count: devSamples.length,
    entries: devSamples.map(s => ({
      id: s.id,
      file_path: s.source_file,
      content_hash: s.content_hash,
    })),
  };
  return signManifest(manifest, key);
}
