/**
 * K3.1 — Type Definitions Tests
 *
 * Validates Zod schemas accept valid data and reject invalid data.
 * Tests schema_version enforcement and all type constraints.
 */

import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  GroundTruthSampleSchema,
  EnvironmentSnapshotSchema,
  ConfusionMatrixSchema,
  ValidationMetricsSchema,
  UncertaintyEstimateSchema,
  DecisionRuleResultSchema,
  ValidationResultSchema,
  CalibrationCertificateSchema,
  TraceabilityChainSchema,
  InvestigationRecordSchema,
  ModuleTaxonomyEntrySchema,
  ModuleTaxonomySchema,
  GeneratedSampleSchema,
  ManifestSchema,
} from '../types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = '2026-03-21T00:00:00.000Z';
const HASH_64 = 'a'.repeat(64);

const validGroundTruth = {
  schema_version: SCHEMA_VERSION,
  id: 'gt-001',
  source_file: 'fixtures/encoded/test-001.txt',
  content_hash: HASH_64,
  content_type: 'text' as const,
  expected_verdict: 'malicious' as const,
  expected_modules: ['encoding-engine'],
  expected_severity: 'CRITICAL' as const,
  expected_categories: ['ENCODING_OBFUSCATION'],
  difficulty: 'moderate' as const,
  source_type: 'synthetic' as const,
  reviewer_1: { id: 'r1', verdict: 'malicious' as const, timestamp: NOW },
  reviewer_2: { id: 'r2', verdict: 'malicious' as const, timestamp: NOW },
  independent_agreement: true,
  holdout: false,
};

const validEnvSnapshot = {
  schema_version: SCHEMA_VERSION,
  os: { platform: 'darwin', release: '25.2.0', arch: 'arm64' },
  node: { version: 'v20.0.0', v8: '11.3.244.8' },
  cpu: { model: 'Apple M2 Pro', cores: 12 },
  memory: { total_mb: 32768 },
  locale: 'en-US',
  timezone: 'America/New_York',
  git: { hash: 'abc123', dirty: false, branch: 'main' },
  package_version: '1.0.0',
  timestamp: NOW,
};

// ---------------------------------------------------------------------------
// K3.1 Tests
// ---------------------------------------------------------------------------

describe('K3.1 — Schema Version', () => {
  it('SCHEMA_VERSION is 1.0.0', () => {
    expect(SCHEMA_VERSION).toBe('1.0.0');
  });

  it('rejects wrong schema_version', () => {
    const bad = { ...validGroundTruth, schema_version: '2.0.0' };
    expect(() => GroundTruthSampleSchema.parse(bad)).toThrow();
  });
});

describe('K3.1 — GroundTruthSample Schema', () => {
  it('accepts valid sample', () => {
    const result = GroundTruthSampleSchema.parse(validGroundTruth);
    expect(result.id).toBe('gt-001');
    expect(result.schema_version).toBe(SCHEMA_VERSION);
  });

  it('accepts sample with conflict resolution', () => {
    const sample = {
      ...validGroundTruth,
      independent_agreement: false,
      conflict_resolution: {
        reviewer_id: 'r3',
        final_verdict: 'malicious' as const,
        rationale: 'Clear injection pattern',
      },
    };
    expect(() => GroundTruthSampleSchema.parse(sample)).not.toThrow();
  });

  it('rejects empty id', () => {
    const bad = { ...validGroundTruth, id: '' };
    expect(() => GroundTruthSampleSchema.parse(bad)).toThrow();
  });

  it('rejects invalid content_hash (not 64 hex chars)', () => {
    const bad = { ...validGroundTruth, content_hash: 'short' };
    expect(() => GroundTruthSampleSchema.parse(bad)).toThrow();
  });

  it('rejects invalid verdict', () => {
    const bad = { ...validGroundTruth, expected_verdict: 'unknown' };
    expect(() => GroundTruthSampleSchema.parse(bad)).toThrow();
  });

  it('rejects invalid difficulty', () => {
    const bad = { ...validGroundTruth, difficulty: 'impossible' };
    expect(() => GroundTruthSampleSchema.parse(bad)).toThrow();
  });

  it('allows nullable expected_severity', () => {
    const sample = { ...validGroundTruth, expected_severity: null };
    const result = GroundTruthSampleSchema.parse(sample);
    expect(result.expected_severity).toBeNull();
  });
});

describe('K3.1 — EnvironmentSnapshot Schema', () => {
  it('accepts valid snapshot', () => {
    const result = EnvironmentSnapshotSchema.parse(validEnvSnapshot);
    expect(result.os.platform).toBe('darwin');
    expect(result.node.version).toBe('v20.0.0');
  });

  it('rejects negative memory', () => {
    const bad = { ...validEnvSnapshot, memory: { total_mb: -100 } };
    expect(() => EnvironmentSnapshotSchema.parse(bad)).toThrow();
  });

  it('rejects zero cores', () => {
    const bad = { ...validEnvSnapshot, cpu: { model: 'Test', cores: 0 } };
    expect(() => EnvironmentSnapshotSchema.parse(bad)).toThrow();
  });
});

describe('K3.1 — ConfusionMatrix Schema', () => {
  it('accepts valid matrix', () => {
    const matrix = {
      schema_version: SCHEMA_VERSION,
      module_id: 'pii-detector',
      tp: 100,
      tn: 90,
      fp: 0,
      fn: 0,
      total: 190,
    };
    const result = ConfusionMatrixSchema.parse(matrix);
    expect(result.tp + result.tn + result.fp + result.fn).toBe(result.total);
  });

  it('rejects negative counts', () => {
    const bad = {
      schema_version: SCHEMA_VERSION,
      module_id: 'test',
      tp: -1,
      tn: 0,
      fp: 0,
      fn: 0,
      total: 1,
    };
    expect(() => ConfusionMatrixSchema.parse(bad)).toThrow();
  });

  it('rejects zero total', () => {
    const bad = {
      schema_version: SCHEMA_VERSION,
      module_id: 'test',
      tp: 0,
      tn: 0,
      fp: 0,
      fn: 0,
      total: 0,
    };
    expect(() => ConfusionMatrixSchema.parse(bad)).toThrow();
  });

  it('rejects when tp+tn+fp+fn !== total', () => {
    const bad = {
      schema_version: SCHEMA_VERSION,
      module_id: 'test',
      tp: 10,
      tn: 10,
      fp: 0,
      fn: 0,
      total: 100,
    };
    expect(() => ConfusionMatrixSchema.parse(bad)).toThrow('tp + tn + fp + fn must equal total');
  });
});

describe('K3.1 — ValidationMetrics Schema', () => {
  it('accepts valid metrics', () => {
    const metrics = {
      schema_version: SCHEMA_VERSION,
      module_id: 'pii-detector',
      accuracy: 1.0,
      precision: 1.0,
      recall: 1.0,
      f1: 1.0,
      mcc: 1.0,
      specificity: 1.0,
      fpr: 0.0,
      fnr: 0.0,
    };
    expect(() => ValidationMetricsSchema.parse(metrics)).not.toThrow();
  });

  it('rejects accuracy > 1', () => {
    const bad = {
      schema_version: SCHEMA_VERSION,
      module_id: 'test',
      accuracy: 1.5,
      precision: 1.0,
      recall: 1.0,
      f1: 1.0,
      mcc: 1.0,
      specificity: 1.0,
      fpr: 0.0,
      fnr: 0.0,
    };
    expect(() => ValidationMetricsSchema.parse(bad)).toThrow();
  });

  it('accepts MCC = -1', () => {
    const metrics = {
      schema_version: SCHEMA_VERSION,
      module_id: 'test',
      accuracy: 0.0,
      precision: 0.0,
      recall: 0.0,
      f1: 0.0,
      mcc: -1.0,
      specificity: 0.0,
      fpr: 1.0,
      fnr: 1.0,
    };
    expect(() => ValidationMetricsSchema.parse(metrics)).not.toThrow();
  });
});

describe('K3.1 — UncertaintyEstimate Schema', () => {
  it('accepts valid estimate', () => {
    const estimate = {
      schema_version: SCHEMA_VERSION,
      module_id: 'test',
      metric: 'accuracy',
      point_estimate: 0.99,
      wilson_ci_lower: 0.97,
      wilson_ci_upper: 1.0,
      clopper_pearson_lower: 0.96,
      clopper_pearson_upper: 1.0,
      expanded_uncertainty: 0.03,
      coverage_factor: 2,
      sample_size: 1000,
    };
    expect(() => UncertaintyEstimateSchema.parse(estimate)).not.toThrow();
  });
});

describe('K3.1 — DecisionRuleResult Schema', () => {
  it('accepts PASS with empty non_conformities', () => {
    const result = {
      schema_version: SCHEMA_VERSION,
      module_id: 'pii-detector',
      verdict: 'PASS' as const,
      total_samples: 300,
      false_positives: 0,
      false_negatives: 0,
      non_conformities: [],
    };
    expect(() => DecisionRuleResultSchema.parse(result)).not.toThrow();
  });

  it('accepts FAIL with non_conformities', () => {
    const result = {
      schema_version: SCHEMA_VERSION,
      module_id: 'bias-detector',
      verdict: 'FAIL' as const,
      total_samples: 200,
      false_positives: 1,
      false_negatives: 0,
      non_conformities: [{
        sample_id: 'gt-042',
        type: 'false_positive' as const,
        expected: 'clean' as const,
        actual: 'malicious' as const,
      }],
    };
    expect(() => DecisionRuleResultSchema.parse(result)).not.toThrow();
  });
});

describe('K3.1 — ValidationResult Schema', () => {
  it('accepts valid result', () => {
    const result = {
      schema_version: SCHEMA_VERSION,
      sample_id: 'gt-001',
      module_id: 'encoding-engine',
      expected_verdict: 'malicious' as const,
      actual_verdict: 'malicious' as const,
      correct: true,
      actual_severity: 'CRITICAL' as const,
      actual_categories: ['ENCODING_OBFUSCATION'],
      actual_findings_count: 3,
      elapsed_ms: 12.5,
    };
    expect(() => ValidationResultSchema.parse(result)).not.toThrow();
  });
});

describe('K3.1 — CalibrationCertificate Schema', () => {
  it('accepts valid certificate', () => {
    const cert = {
      schema_version: SCHEMA_VERSION,
      certificate_id: 'cal-001',
      module_id: 'pii-detector',
      tool_build_hash: 'abc123',
      reference_set_version: '1.0',
      environment: validEnvSnapshot,
      result: 'PASS' as const,
      samples_tested: 20,
      samples_passed: 20,
      timestamp: NOW,
    };
    expect(() => CalibrationCertificateSchema.parse(cert)).not.toThrow();
  });
});

describe('K3.1 — TraceabilityChain Schema', () => {
  it('accepts valid chain', () => {
    const chain = {
      schema_version: SCHEMA_VERSION,
      result_id: 'res-001',
      sample_id: 'gt-001',
      corpus_version: '1.0',
      tool_version: '1.0.0',
      tool_build_hash: 'abc123',
      module_hash: 'def456',
      calibration_certificate_id: 'cal-001',
      environment_hash: 'ghi789',
      config_hash: 'jkl012',
    };
    expect(() => TraceabilityChainSchema.parse(chain)).not.toThrow();
  });
});

describe('K3.1 — InvestigationRecord Schema', () => {
  it('accepts valid record', () => {
    const record = {
      schema_version: SCHEMA_VERSION,
      investigation_id: 'inv-001',
      sample_id: 'gt-042',
      module_id: 'bias-detector',
      false_type: 'false_positive' as const,
      root_cause: 'pattern_gap' as const,
      fix_applied: 'Added word boundary to pattern',
      revalidation_passed: true,
      iteration_count: 1,
      opened_at: NOW,
      closed_at: NOW,
    };
    expect(() => InvestigationRecordSchema.parse(record)).not.toThrow();
  });
});

describe('K3.1 — ModuleTaxonomy Schema', () => {
  it('accepts valid taxonomy', () => {
    const taxonomy = {
      schema_version: SCHEMA_VERSION,
      generated_at: NOW,
      modules: [{
        module_id: 'pii-detector',
        display_name: 'PII Detector',
        description: 'Detects PII',
        tier: 1,
        input_type: 'text' as const,
        deterministic: true,
        detection_categories: ['PII_SSN'],
        severity_levels: ['CRITICAL' as const],
        capabilities: ['pii_detection'],
        source_file: 'src/modules/pii-detector.ts',
        pattern_count: 11,
      }],
    };
    expect(() => ModuleTaxonomySchema.parse(taxonomy)).not.toThrow();
  });

  it('rejects tier outside 1-3', () => {
    const bad = {
      schema_version: SCHEMA_VERSION,
      generated_at: NOW,
      modules: [{
        module_id: 'test',
        display_name: 'Test',
        description: 'Test',
        tier: 4,
        input_type: 'text' as const,
        deterministic: true,
        detection_categories: ['TEST'],
        severity_levels: ['INFO' as const],
        capabilities: ['test'],
        source_file: 'test.ts',
        pattern_count: 0,
      }],
    };
    expect(() => ModuleTaxonomySchema.parse(bad)).toThrow();
  });
});

describe('K3.1 — GeneratedSample Schema', () => {
  it('accepts valid generated sample', () => {
    const sample = {
      schema_version: SCHEMA_VERSION,
      id: 'gt-001_encoding_0',
      base_sample_id: 'gt-001',
      generator_id: 'encoding-variations',
      generator_version: '1.0.0',
      seed: 42,
      content: 'test content',
      content_hash: HASH_64,
      content_type: 'text' as const,
      expected_verdict: 'malicious' as const,
      expected_modules: ['encoding-engine'],
      variation_type: 'base64',
      difficulty: 'moderate' as const,
    };
    expect(() => GeneratedSampleSchema.parse(sample)).not.toThrow();
  });
});

describe('K3.1 — Manifest Schema', () => {
  it('accepts valid manifest', () => {
    const manifest = {
      schema_version: SCHEMA_VERSION,
      manifest_type: 'ground-truth' as const,
      generated_at: NOW,
      entry_count: 1,
      entries: [{
        id: 'gt-001',
        file_path: 'text/encoding-engine/test-001.txt',
        content_hash: HASH_64,
      }],
    };
    expect(() => ManifestSchema.parse(manifest)).not.toThrow();
  });

  it('accepts manifest with HMAC signature', () => {
    const manifest = {
      schema_version: SCHEMA_VERSION,
      manifest_type: 'holdout' as const,
      generated_at: NOW,
      entry_count: 0,
      entries: [],
      hmac_signature: 'b'.repeat(64),
    };
    expect(() => ManifestSchema.parse(manifest)).not.toThrow();
  });
});
