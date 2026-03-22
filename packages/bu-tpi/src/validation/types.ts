/**
 * KATANA Validation Framework — Type Definitions (K3.1)
 *
 * All serialized types include schema_version for forward compatibility.
 * Zod schemas provide runtime validation at system boundaries.
 *
 * ISO 17025 Clauses: 7.2.2, 7.6, 7.8.6
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema Version
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = '1.0.0' as const;

// ---------------------------------------------------------------------------
// Enums & Constants
// ---------------------------------------------------------------------------

export const ValidationVerdict = {
  PASS: 'PASS',
  FAIL: 'FAIL',
} as const;
export type ValidationVerdict = (typeof ValidationVerdict)[keyof typeof ValidationVerdict];

export const SampleContentType = {
  TEXT: 'text',
  BINARY: 'binary',
} as const;
export type SampleContentType = (typeof SampleContentType)[keyof typeof SampleContentType];

export const SampleDifficulty = {
  TRIVIAL: 'trivial',
  MODERATE: 'moderate',
  ADVANCED: 'advanced',
  EVASIVE: 'evasive',
} as const;
export type SampleDifficulty = (typeof SampleDifficulty)[keyof typeof SampleDifficulty];

export const SampleSourceType = {
  SYNTHETIC: 'synthetic',
  REAL_WORLD: 'real-world',
  ADAPTED: 'adapted',
  GENERATED: 'generated',
} as const;
export type SampleSourceType = (typeof SampleSourceType)[keyof typeof SampleSourceType];

export const SampleVerdict = {
  CLEAN: 'clean',
  MALICIOUS: 'malicious',
} as const;
export type SampleVerdict = (typeof SampleVerdict)[keyof typeof SampleVerdict];

export const ModuleTier = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
} as const;
export type ModuleTier = (typeof ModuleTier)[keyof typeof ModuleTier];

export const Severity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const RunStatus = {
  QUEUED: 'queued',
  CALIBRATING: 'calibrating',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const FalseType = {
  FALSE_POSITIVE: 'false_positive',
  FALSE_NEGATIVE: 'false_negative',
} as const;
export type FalseType = (typeof FalseType)[keyof typeof FalseType];

export const RootCauseCategory = {
  PATTERN_GAP: 'pattern_gap',
  THRESHOLD_ISSUE: 'threshold_issue',
  ENCODING_BLIND_SPOT: 'encoding_blind_spot',
  MODULE_LIMITATION: 'module_limitation',
  LABELING_ERROR: 'labeling_error',
} as const;
export type RootCauseCategory = (typeof RootCauseCategory)[keyof typeof RootCauseCategory];

// ---------------------------------------------------------------------------
// Ground Truth Sample
// ---------------------------------------------------------------------------

export const GroundTruthSampleSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  id: z.string().min(1).max(256),
  source_file: z.string().min(1),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  content_type: z.enum(['text', 'binary']),
  expected_verdict: z.enum(['clean', 'malicious']),
  expected_modules: z.array(z.string().min(1)),
  expected_severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).nullable(),
  expected_categories: z.array(z.string().min(1)),
  difficulty: z.enum(['trivial', 'moderate', 'advanced', 'evasive']),
  source_type: z.enum(['synthetic', 'real-world', 'adapted', 'generated']),
  reviewer_1: z.object({
    id: z.string().min(1),
    verdict: z.enum(['clean', 'malicious']),
    timestamp: z.string().datetime(),
  }),
  reviewer_2: z.object({
    id: z.string().min(1),
    verdict: z.enum(['clean', 'malicious']),
    timestamp: z.string().datetime(),
  }),
  independent_agreement: z.boolean(),
  conflict_resolution: z.object({
    reviewer_id: z.string().min(1),
    final_verdict: z.enum(['clean', 'malicious']),
    rationale: z.string().min(1),
  }).optional(),
  holdout: z.boolean(),
  notes: z.string().optional(),
});

export type GroundTruthSample = z.infer<typeof GroundTruthSampleSchema>;

// ---------------------------------------------------------------------------
// Environment Snapshot
// ---------------------------------------------------------------------------

export const EnvironmentSnapshotSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  os: z.object({
    platform: z.string(),
    release: z.string(),
    arch: z.string(),
  }),
  node: z.object({
    version: z.string(),
    v8: z.string(),
  }),
  cpu: z.object({
    model: z.string(),
    cores: z.number().int().positive(),
  }),
  memory: z.object({
    total_mb: z.number().positive(),
  }),
  locale: z.string(),
  timezone: z.string(),
  git: z.object({
    hash: z.string(),
    dirty: z.boolean(),
    branch: z.string(),
  }),
  package_version: z.string(),
  timestamp: z.string().datetime(),
});

export type EnvironmentSnapshot = z.infer<typeof EnvironmentSnapshotSchema>;

// ---------------------------------------------------------------------------
// Confusion Matrix
// ---------------------------------------------------------------------------

export const ConfusionMatrixSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  module_id: z.string().min(1),
  tp: z.number().int().nonnegative(),
  tn: z.number().int().nonnegative(),
  fp: z.number().int().nonnegative(),
  fn: z.number().int().nonnegative(),
  total: z.number().int().positive(),
}).refine(
  data => data.tp + data.tn + data.fp + data.fn === data.total,
  { message: 'tp + tn + fp + fn must equal total' },
);

export type ConfusionMatrix = z.infer<typeof ConfusionMatrixSchema>;

// ---------------------------------------------------------------------------
// Validation Metrics
// ---------------------------------------------------------------------------

export const ValidationMetricsSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  module_id: z.string().min(1),
  accuracy: z.number().min(0).max(1),
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  f1: z.number().min(0).max(1),
  mcc: z.number().min(-1).max(1),
  specificity: z.number().min(0).max(1),
  fpr: z.number().min(0).max(1),
  fnr: z.number().min(0).max(1),
});

export type ValidationMetrics = z.infer<typeof ValidationMetricsSchema>;

// ---------------------------------------------------------------------------
// Uncertainty Estimate
// ---------------------------------------------------------------------------

export const UncertaintyEstimateSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  module_id: z.string().min(1),
  metric: z.string().min(1),
  point_estimate: z.number(),
  wilson_ci_lower: z.number(),
  wilson_ci_upper: z.number(),
  clopper_pearson_lower: z.number(),
  clopper_pearson_upper: z.number(),
  expanded_uncertainty: z.number().nonnegative(),
  coverage_factor: z.number().positive(),
  sample_size: z.number().int().positive(),
});

export type UncertaintyEstimate = z.infer<typeof UncertaintyEstimateSchema>;

// ---------------------------------------------------------------------------
// Decision Rule Result (ISO 7.8.6)
// ---------------------------------------------------------------------------

export const DecisionRuleResultSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  module_id: z.string().min(1),
  verdict: z.enum(['PASS', 'FAIL']),
  total_samples: z.number().int().positive(),
  false_positives: z.number().int().nonnegative(),
  false_negatives: z.number().int().nonnegative(),
  uncertainty: UncertaintyEstimateSchema.optional(),
  non_conformities: z.array(z.object({
    sample_id: z.string().min(1),
    type: z.enum(['false_positive', 'false_negative']),
    expected: z.enum(['clean', 'malicious']),
    actual: z.enum(['clean', 'malicious']),
  })),
});

export type DecisionRuleResult = z.infer<typeof DecisionRuleResultSchema>;

// ---------------------------------------------------------------------------
// Validation Result (per sample)
// ---------------------------------------------------------------------------

export const ValidationResultSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  sample_id: z.string().min(1),
  module_id: z.string().min(1),
  expected_verdict: z.enum(['clean', 'malicious']),
  actual_verdict: z.enum(['clean', 'malicious']),
  correct: z.boolean(),
  actual_severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).nullable(),
  actual_categories: z.array(z.string()),
  actual_findings_count: z.number().int().nonnegative(),
  elapsed_ms: z.number().nonnegative(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ---------------------------------------------------------------------------
// Calibration Certificate
// ---------------------------------------------------------------------------

export const CalibrationCertificateSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  certificate_id: z.string().min(1),
  module_id: z.string().min(1),
  tool_build_hash: z.string().min(1),
  reference_set_version: z.string().min(1),
  environment: EnvironmentSnapshotSchema,
  result: z.enum(['PASS', 'FAIL']),
  samples_tested: z.number().int().positive(),
  samples_passed: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  signature: z.string().optional(),
});

export type CalibrationCertificate = z.infer<typeof CalibrationCertificateSchema>;

// ---------------------------------------------------------------------------
// Traceability Chain
// ---------------------------------------------------------------------------

export const TraceabilityChainSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  result_id: z.string().min(1),
  sample_id: z.string().min(1),
  corpus_version: z.string().min(1),
  tool_version: z.string().min(1),
  tool_build_hash: z.string().min(1),
  module_hash: z.string().min(1),
  calibration_certificate_id: z.string().min(1),
  environment_hash: z.string().min(1),
  config_hash: z.string().min(1),
});

export type TraceabilityChain = z.infer<typeof TraceabilityChainSchema>;

// ---------------------------------------------------------------------------
// Validation Run
// ---------------------------------------------------------------------------

export const ValidationRunSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  run_id: z.string().min(1),
  status: z.enum(['queued', 'calibrating', 'running', 'completed', 'failed']),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  environment: EnvironmentSnapshotSchema,
  modules_validated: z.array(z.string().min(1)),
  corpus_version: z.string().min(1),
  include_holdout: z.boolean(),
  total_samples: z.number().int().nonnegative(),
  samples_processed: z.number().int().nonnegative(),
  results: z.array(ValidationResultSchema),
  per_module_matrices: z.record(z.string(), ConfusionMatrixSchema),
  per_module_metrics: z.record(z.string(), ValidationMetricsSchema),
  per_module_decisions: z.record(z.string(), DecisionRuleResultSchema),
  non_conformity_count: z.number().int().nonnegative(),
  overall_verdict: z.enum(['PASS', 'FAIL']),
  elapsed_ms: z.number().nonnegative(),
});

export type ValidationRun = z.infer<typeof ValidationRunSchema>;

// ---------------------------------------------------------------------------
// Investigation Record
// ---------------------------------------------------------------------------

export const InvestigationRecordSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  investigation_id: z.string().min(1),
  sample_id: z.string().min(1),
  module_id: z.string().min(1),
  false_type: z.enum(['false_positive', 'false_negative']),
  root_cause: z.enum([
    'pattern_gap',
    'threshold_issue',
    'encoding_blind_spot',
    'module_limitation',
    'labeling_error',
  ]),
  fix_applied: z.string().min(1),
  revalidation_passed: z.boolean(),
  iteration_count: z.number().int().positive(),
  opened_at: z.string().datetime(),
  closed_at: z.string().datetime().optional(),
});

export type InvestigationRecord = z.infer<typeof InvestigationRecordSchema>;

// ---------------------------------------------------------------------------
// Challenge Record (K9.2)
// ---------------------------------------------------------------------------

export const ChallengeStatus = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved',
} as const;
export type ChallengeStatus = (typeof ChallengeStatus)[keyof typeof ChallengeStatus];

export const ChallengeRecordSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  challenge_id: z.string().min(1).max(256),
  sample_id: z.string().min(1).max(256),
  module_id: z.string().min(1).max(256),
  trigger_run_count: z.number().int().min(3),
  reviewer_1: z.object({
    id: z.string().min(1),
    verdict: z.enum(['clean', 'malicious']),
    timestamp: z.string().datetime(),
  }),
  reviewer_2: z.object({
    id: z.string().min(1),
    verdict: z.enum(['clean', 'malicious']),
    timestamp: z.string().datetime(),
  }),
  reviewer_3: z.object({
    id: z.string().min(1),
    verdict: z.enum(['clean', 'malicious']),
    timestamp: z.string().datetime(),
  }),
  majority_verdict: z.enum(['clean', 'malicious']),
  original_verdict: z.enum(['clean', 'malicious']),
  label_changed: z.boolean(),
  status: z.enum(['open', 'reviewing', 'resolved']),
  opened_at: z.string().datetime(),
  resolved_at: z.string().datetime().optional(),
  rationale: z.string().optional(),
});

export type ChallengeRecord = z.infer<typeof ChallengeRecordSchema>;

// ---------------------------------------------------------------------------
// CAPA Record (K9.3)
// ---------------------------------------------------------------------------

export const CAPATriggerType = {
  VALIDATION_FAILURE: 'validation_failure',
  REGRESSION: 'regression',
  SYSTEMATIC_ROOT_CAUSE: 'systematic_root_cause',
  CALIBRATION_FAILURE: 'calibration_failure',
} as const;
export type CAPATriggerType = (typeof CAPATriggerType)[keyof typeof CAPATriggerType];

export const CAPAStatus = {
  OPEN: 'open',
  ROOT_CAUSE_ANALYSIS: 'root_cause_analysis',
  ACTION_PLANNED: 'action_planned',
  IMPLEMENTING: 'implementing',
  REVALIDATING: 'revalidating',
  EFFECTIVENESS_REVIEW: 'effectiveness_review',
  CLOSED: 'closed',
} as const;
export type CAPAStatus = (typeof CAPAStatus)[keyof typeof CAPAStatus];

export const CAPARecordSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  capa_id: z.string().min(1).max(256),
  trigger_type: z.enum([
    'validation_failure',
    'regression',
    'systematic_root_cause',
    'calibration_failure',
  ]),
  trigger_context: z.object({
    module_id: z.string().min(1).optional(),
    run_id: z.string().min(1).optional(),
    investigation_ids: z.array(z.string().min(1)).optional(),
    description: z.string().min(1),
  }),
  status: z.enum([
    'open',
    'root_cause_analysis',
    'action_planned',
    'implementing',
    'revalidating',
    'effectiveness_review',
    'closed',
  ]),
  root_cause_analysis: z.string().optional(),
  corrective_action_plan: z.string().optional(),
  implementation_notes: z.string().optional(),
  revalidation_run_id: z.string().optional(),
  revalidation_passed: z.boolean().optional(),
  effectiveness_review_date: z.string().datetime().optional(),
  effectiveness_review_notes: z.string().optional(),
  opened_at: z.string().datetime(),
  closed_at: z.string().datetime().optional(),
});

export type CAPARecord = z.infer<typeof CAPARecordSchema>;

// ---------------------------------------------------------------------------
// Repeatability Result (K5.1)
// ---------------------------------------------------------------------------

export const RepeatabilityResultSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  module_id: z.string().min(1),
  run_count: z.number().int().min(2),
  deterministic: z.boolean(),
  full_agreement: z.boolean(),
  verdict_agreement: z.boolean(),
  disagreement_count: z.number().int().nonnegative(),
  disagreement_samples: z.array(z.object({
    sample_id: z.string().min(1),
    field: z.string().min(1),
    values: z.array(z.string()),
  })),
  tolerance_band: z.object({
    mean: z.number(),
    std_dev: z.number().nonnegative(),
    lower: z.number(),
    upper: z.number(),
  }).optional(),
  verdict: z.enum(['PASS', 'FAIL']),
  timestamp: z.string().datetime(),
});

export type RepeatabilityResult = z.infer<typeof RepeatabilityResultSchema>;

// ---------------------------------------------------------------------------
// Reproducibility Result (K5.2)
// ---------------------------------------------------------------------------

export const ReproducibilityResultSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  module_id: z.string().min(1),
  environments: z.array(z.object({
    label: z.string().min(1),
    os: z.string().min(1),
    arch: z.string().min(1),
    node_version: z.string().min(1),
  })),
  cross_env_agreement: z.boolean(),
  disagreement_count: z.number().int().nonnegative(),
  disagreement_samples: z.array(z.object({
    sample_id: z.string().min(1),
    field: z.string().min(1),
    env_values: z.record(z.string(), z.string()),
  })),
  verdict: z.enum(['PASS', 'FAIL']),
  timestamp: z.string().datetime(),
});

export type ReproducibilityResult = z.infer<typeof ReproducibilityResultSchema>;

// ---------------------------------------------------------------------------
// Non-Deterministic Tolerance Band (K5.3)
// ---------------------------------------------------------------------------

export const ToleranceBandSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  module_id: z.string().min(1),
  metric: z.string().min(1),
  run_count: z.number().int().min(2),
  mean: z.number(),
  std_dev: z.number().nonnegative(),
  min: z.number(),
  max: z.number(),
  lower_bound: z.number(),
  upper_bound: z.number(),
  sigma: z.number().positive(),
  within_tolerance: z.boolean(),
  timestamp: z.string().datetime(),
});

export type ToleranceBand = z.infer<typeof ToleranceBandSchema>;

// ---------------------------------------------------------------------------
// Validation Report
// ---------------------------------------------------------------------------

export const ValidationReportSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  report_id: z.string().min(1),
  run_id: z.string().min(1),
  generated_at: z.string().datetime(),
  environment: EnvironmentSnapshotSchema,
  corpus_version: z.string().min(1),
  tool_version: z.string().min(1),
  modules: z.array(z.object({
    module_id: z.string().min(1),
    tier: z.number().int().min(1).max(3),
    matrix: ConfusionMatrixSchema,
    metrics: ValidationMetricsSchema,
    uncertainty: z.array(UncertaintyEstimateSchema),
    decision: DecisionRuleResultSchema,
    calibration_certificate_id: z.string().min(1),
  })),
  overall_verdict: z.enum(['PASS', 'FAIL']),
  non_conformity_count: z.number().int().nonnegative(),
  signature: z.string().optional(),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;

// ---------------------------------------------------------------------------
// Module Taxonomy
// ---------------------------------------------------------------------------

export const ModuleTaxonomyEntrySchema = z.object({
  module_id: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().min(1),
  tier: z.number().int().min(1).max(3),
  input_type: z.enum(['text', 'binary', 'multimodal']),
  deterministic: z.boolean(),
  detection_categories: z.array(z.string().min(1)),
  severity_levels: z.array(z.enum(['INFO', 'WARNING', 'CRITICAL'])),
  capabilities: z.array(z.string().min(1)),
  source_file: z.string().min(1),
  pattern_count: z.number().int().nonnegative(),
});

export type ModuleTaxonomyEntry = z.infer<typeof ModuleTaxonomyEntrySchema>;

export const ModuleTaxonomySchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  generated_at: z.string().datetime(),
  modules: z.array(ModuleTaxonomyEntrySchema),
});

export type ModuleTaxonomy = z.infer<typeof ModuleTaxonomySchema>;

// ---------------------------------------------------------------------------
// Generator Types
// ---------------------------------------------------------------------------

export const GeneratedSampleSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  base_sample_id: z.string().min(1),
  generator_id: z.string().min(1),
  generator_version: z.string().min(1),
  seed: z.number().int().nonnegative(),
  content: z.string(),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  content_type: z.enum(['text', 'binary']),
  expected_verdict: z.enum(['clean', 'malicious']),
  expected_modules: z.array(z.string().min(1)),
  variation_type: z.string().min(1),
  difficulty: z.enum(['trivial', 'moderate', 'advanced', 'evasive']),
});

export type GeneratedSample = z.infer<typeof GeneratedSampleSchema>;

// ---------------------------------------------------------------------------
// Manifest (HMAC-signed index)
// ---------------------------------------------------------------------------

export const ManifestSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  manifest_type: z.enum(['ground-truth', 'generated', 'holdout', 'calibration']),
  generated_at: z.string().datetime(),
  entry_count: z.number().int().nonnegative(),
  entries: z.array(z.object({
    id: z.string().min(1),
    file_path: z.string().min(1),
    content_hash: z.string().regex(/^[a-f0-9]{64}$/),
  })),
  hmac_signature: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;
