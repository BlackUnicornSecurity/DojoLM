/**
 * KATANA Calibration Reference Sets (K4.1)
 *
 * 10 positive + 10 negative per module. Immutable after creation.
 * Stored in HMAC-signed manifest. Used as pre-validation sanity check.
 *
 * ISO 17025 Clause 6.4, 6.5
 */

import { createHash } from 'node:crypto';
import { CALIBRATION_CONFIG } from '../config.js';
import {
  SCHEMA_VERSION,
  type GroundTruthSample,
  type Manifest,
} from '../types.js';
import { SeededRNG } from '../generators/generator-registry.js';
import { signManifest, verifyManifest } from '../integrity/hmac-signer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReferenceSet {
  readonly module_id: string;
  readonly positive_samples: readonly GroundTruthSample[];
  readonly negative_samples: readonly GroundTruthSample[];
  readonly version: string;
}

export interface ReferenceSetSelection {
  readonly reference_sets: readonly ReferenceSet[];
  readonly stats: ReferenceSetStats;
}

export interface ReferenceSetStats {
  readonly modules_total: number;
  readonly modules_with_reference: number;
  readonly modules_insufficient: number;
  readonly total_reference_samples: number;
  readonly insufficient_modules: readonly string[];
}

// ---------------------------------------------------------------------------
// Reference Set Selection
// ---------------------------------------------------------------------------

/**
 * Select calibration reference samples from the ground truth corpus.
 *
 * For each module:
 * - Select 10 positive (malicious) samples expected for this module
 * - Select 10 negative (clean) samples
 * - Selection is deterministic via SeededRNG
 *
 * Modules with insufficient samples are reported in stats but not skipped.
 *
 * @param samples - All ground truth samples
 * @param moduleIds - Module IDs to create reference sets for
 * @param seed - RNG seed for reproducible selection (required — must not be a public default)
 * @returns Reference sets and selection statistics
 */
export function selectReferenceSets(
  samples: readonly GroundTruthSample[],
  moduleIds: readonly string[],
  seed: number,
): ReferenceSetSelection {
  // Pre-classify: all clean samples (universal negatives)
  const cleanSamples = samples.filter(s => s.expected_verdict === 'clean');

  // Pre-classify: positive samples per module
  const positivesByModule = new Map<string, GroundTruthSample[]>();
  for (const sample of samples) {
    if (sample.expected_verdict === 'malicious') {
      for (const moduleId of sample.expected_modules) {
        const existing = positivesByModule.get(moduleId);
        if (existing) {
          existing.push(sample);
        } else {
          positivesByModule.set(moduleId, [sample]);
        }
      }
    }
  }

  const referenceSets: ReferenceSet[] = [];
  const insufficientModules: string[] = [];
  let totalRefSamples = 0;

  for (const moduleId of moduleIds) {
    // Per-module seed: derive stable seed from base seed + module ID
    // This ensures adding/removing/reordering modules doesn't change
    // reference sets for other modules.
    const moduleSeed = deriveModuleSeed(seed, moduleId);
    const rng = new SeededRNG(moduleSeed);

    const positives = positivesByModule.get(moduleId) ?? [];

    const selectedPositive = deterministicSelect(
      positives,
      CALIBRATION_CONFIG.REFERENCE_POSITIVE,
      rng,
    );
    const selectedNegative = deterministicSelect(
      cleanSamples,
      CALIBRATION_CONFIG.REFERENCE_NEGATIVE,
      rng,
    );

    if (
      selectedPositive.length < CALIBRATION_CONFIG.REFERENCE_POSITIVE ||
      selectedNegative.length < CALIBRATION_CONFIG.REFERENCE_NEGATIVE
    ) {
      insufficientModules.push(moduleId);
    }

    // Version uses hash of (seed + moduleId) — does not expose raw seed
    const versionHash = createHash('sha256').update(`${seed}:${moduleId}`).digest('hex').slice(0, 12);
    const version = `ref-v1-${moduleId}-${versionHash}`;
    referenceSets.push({
      module_id: moduleId,
      positive_samples: selectedPositive,
      negative_samples: selectedNegative,
      version,
    });

    totalRefSamples += selectedPositive.length + selectedNegative.length;
  }

  return {
    reference_sets: referenceSets,
    stats: {
      modules_total: moduleIds.length,
      modules_with_reference: moduleIds.length - insufficientModules.length,
      modules_insufficient: insufficientModules.length,
      total_reference_samples: totalRefSamples,
      insufficient_modules: insufficientModules,
    },
  };
}

/**
 * Derive a stable per-module seed from a base seed and module ID.
 * Uses SHA-256 to mix, then takes first 4 bytes as a 32-bit integer.
 */
function deriveModuleSeed(baseSeed: number, moduleId: string): number {
  const hash = createHash('sha256').update(`${baseSeed}:${moduleId}`).digest();
  return hash.readUInt32BE(0);
}

/**
 * Deterministic sample selection using Fisher-Yates shuffle.
 * Creates a copy — does not mutate the input pool.
 * Selects up to `count` samples from the pool.
 */
function deterministicSelect(
  pool: readonly GroundTruthSample[],
  count: number,
  rng: SeededRNG,
): GroundTruthSample[] {
  if (pool.length === 0) return [];

  // Copy and shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  return shuffled.slice(0, Math.min(count, pool.length));
}

// ---------------------------------------------------------------------------
// Manifest Building
// ---------------------------------------------------------------------------

/**
 * Build a calibration manifest for a reference set.
 */
export function buildReferenceSetManifest(refSet: ReferenceSet): Manifest {
  const allSamples = [...refSet.positive_samples, ...refSet.negative_samples];
  return {
    schema_version: SCHEMA_VERSION,
    manifest_type: 'calibration',
    generated_at: new Date().toISOString(),
    entry_count: allSamples.length,
    entries: allSamples.map(s => ({
      id: s.id,
      file_path: s.source_file,
      content_hash: s.content_hash,
    })),
  };
}

/**
 * Build and HMAC-sign a calibration reference set manifest.
 *
 * @param refSet - Reference set to build manifest for
 * @param key - HMAC key (if omitted, reads from env var)
 * @returns Signed manifest
 */
export function buildSignedReferenceManifest(
  refSet: ReferenceSet,
  key?: string,
): Manifest {
  const manifest = buildReferenceSetManifest(refSet);
  return signManifest(manifest, key);
}

/**
 * Verify a signed reference set manifest.
 */
export function verifyReferenceManifest(
  manifest: Manifest,
  key?: string,
): boolean {
  return verifyManifest(manifest, key);
}

// ---------------------------------------------------------------------------
// Reference Set Validation
// ---------------------------------------------------------------------------

/**
 * Validate that a reference set has the expected sample counts.
 */
export function validateReferenceSet(refSet: ReferenceSet): {
  valid: boolean;
  positive_count: number;
  negative_count: number;
  expected_positive: number;
  expected_negative: number;
} {
  return {
    valid:
      refSet.positive_samples.length === CALIBRATION_CONFIG.REFERENCE_POSITIVE &&
      refSet.negative_samples.length === CALIBRATION_CONFIG.REFERENCE_NEGATIVE,
    positive_count: refSet.positive_samples.length,
    negative_count: refSet.negative_samples.length,
    expected_positive: CALIBRATION_CONFIG.REFERENCE_POSITIVE,
    expected_negative: CALIBRATION_CONFIG.REFERENCE_NEGATIVE,
  };
}
