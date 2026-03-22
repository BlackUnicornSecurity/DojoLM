/**
 * KATANA Validation Framework — Configuration
 *
 * All configurable thresholds and settings in one place.
 * ISO 17025 requires documented, controlled configuration.
 */

// ---------------------------------------------------------------------------
// Corpus Requirements
// ---------------------------------------------------------------------------

export const CORPUS_CONFIG = {
  /** Minimum positive + negative samples per Tier 1 module */
  TIER_1_MIN_POSITIVE: 150,
  TIER_1_MIN_NEGATIVE: 150,

  /** Minimum positive + negative samples per Tier 2 module */
  TIER_2_MIN_POSITIVE: 100,
  TIER_2_MIN_NEGATIVE: 100,

  /** Minimum positive + negative samples per Tier 3 module */
  TIER_3_MIN_POSITIVE: 50,
  TIER_3_MIN_NEGATIVE: 50,

  /** Holdout set percentage */
  HOLDOUT_PERCENTAGE: 0.20,

  /** Total corpus target */
  TARGET_TOTAL_SAMPLES: 200_000,
} as const;

// ---------------------------------------------------------------------------
// Validation Thresholds
// ---------------------------------------------------------------------------

export const VALIDATION_CONFIG = {
  /** Repeatability run count for deterministic modules */
  REPEATABILITY_RUNS: 10,

  /** Repeatability run count for non-deterministic modules */
  NON_DET_REPEATABILITY_RUNS: 30,

  /** Sigma threshold for non-deterministic tolerance bands */
  NON_DET_SIGMA: 3,

  /** Inter-rater reliability targets (Cohen's kappa) */
  KAPPA_TIER_1: 0.85,
  KAPPA_TIER_2: 0.70,

  /** Confidence interval level */
  CONFIDENCE_LEVEL: 0.95,

  /** Coverage factor for expanded uncertainty (k=2 for ~95%) */
  COVERAGE_FACTOR: 2,

  /** Maximum sample processing timeout (ms) */
  SAMPLE_TIMEOUT_MS: 30_000,

  /** Memory limit multiplier for boundary testing */
  BOUNDARY_MEMORY_MULTIPLIER: 2,

  /** Checkpoint interval (samples) */
  CHECKPOINT_INTERVAL: 1_000,

  /** Performance regression warning threshold */
  PERF_WARNING_THRESHOLD: 0.20,

  /** Performance regression failure threshold */
  PERF_FAILURE_THRESHOLD: 0.50,
} as const;

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

export const CALIBRATION_CONFIG = {
  /** Reference samples per module (positive) */
  REFERENCE_POSITIVE: 10,

  /** Reference samples per module (negative) */
  REFERENCE_NEGATIVE: 10,
} as const;

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export const GENERATOR_CONFIG = {
  /** RNG divisor for [0, 1) range — lesson learned from fuzzing */
  RNG_DIVISOR: 0x100000000,

  /** Default seed for reproducible generation */
  DEFAULT_SEED: 42,

  /** Maximum generated corpus size before batching */
  BATCH_SIZE: 10_000,

  /** Full generation time target (minutes) */
  TARGET_GENERATION_MINUTES: 15,
} as const;

// ---------------------------------------------------------------------------
// Integrity
// ---------------------------------------------------------------------------

export const INTEGRITY_CONFIG = {
  /** HMAC algorithm */
  HMAC_ALGORITHM: 'sha256' as const,

  /** Hash algorithm for content hashing */
  HASH_ALGORITHM: 'sha256' as const,

  /** Ed25519 key type */
  SIGNATURE_ALGORITHM: 'ed25519' as const,

  /** Environment variable for HMAC key */
  HMAC_KEY_ENV_VAR: 'KATANA_HMAC_KEY',

  /** Environment variable for Ed25519 private key */
  SIGNING_KEY_ENV_VAR: 'KATANA_SIGNING_KEY',

  /** Environment variable for Ed25519 public key */
  VERIFY_KEY_ENV_VAR: 'KATANA_VERIFY_KEY',
} as const;

// ---------------------------------------------------------------------------
// Investigation & CAPA (K9)
// ---------------------------------------------------------------------------

export const INVESTIGATION_CONFIG = {
  /** Minimum validation run failures to trigger a ground truth challenge (K9.2) */
  CHALLENGE_TRIGGER_RUN_COUNT: 3,

  /** Regression threshold for CAPA trigger (> 0.5% drop) */
  REGRESSION_THRESHOLD: 0.005,

  /** Effectiveness review period in days (K9.3) */
  EFFECTIVENESS_REVIEW_DAYS: 30,
} as const;

// ---------------------------------------------------------------------------
// Paths (relative to packages/bu-tpi)
// ---------------------------------------------------------------------------

export const PATHS = {
  /** Validation data root (outside src/) */
  VALIDATION_DATA: 'validation',

  /** Ground truth corpus */
  GROUND_TRUTH: 'validation/corpus/ground-truth',
  GROUND_TRUTH_TEXT: 'validation/corpus/ground-truth/text',
  GROUND_TRUTH_BINARY: 'validation/corpus/ground-truth/binary',

  /** Generated corpus */
  GENERATED: 'validation/corpus/generated',

  /** Holdout set */
  HOLDOUT: 'validation/corpus/holdout',

  /** Calibration */
  REFERENCE_SETS: 'validation/calibration/reference-sets',
  CERTIFICATES: 'validation/calibration/certificates',

  /** Reports */
  REPORT_RUNS: 'validation/reports/runs',
  CONTROLLED_DOCS: 'validation/reports/controlled-documents',

  /** Taxonomy */
  TAXONOMY: 'validation/taxonomy',

  /** Existing fixtures */
  FIXTURES: 'fixtures',
  FIXTURES_MANIFEST: 'fixtures/manifest.json',
} as const;
