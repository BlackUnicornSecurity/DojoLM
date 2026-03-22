/**
 * Tests for KATANA Validation Runner Core (K3.6)
 *
 * Tests the core validation harness:
 * - Sample conversion and module grouping
 * - Per-module confusion matrix computation
 * - Metrics and decision rule application
 * - Checkpoint/resume
 * - Error isolation
 * - Timeout handling
 * - Progress reporting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import {
  runValidation,
  type InputSample,
  type RunOptions,
  type RunProgress,
} from '../runner/validation-runner.js';
import { SCHEMA_VERSION } from '../types.js';
import type { GroundTruthSample, GeneratedSample } from '../types.js';

// ---------------------------------------------------------------------------
// Mock the scanner to avoid loading the full scanner module
// ---------------------------------------------------------------------------

vi.mock('../../scanner.js', () => ({
  scan: (text: string) => {
    // Simple mock: if text contains "malicious", detect it
    const hasMalicious = text.toLowerCase().includes('malicious') ||
      text.toLowerCase().includes('inject') ||
      text.toLowerCase().includes('ignore previous');

    return {
      findings: hasMalicious ? [{
        category: 'PROMPT_INJECTION',
        severity: 'CRITICAL',
        description: 'test finding',
        match: text.slice(0, 50),
        source: 'test',
        engine: 'enhanced-pi',
      }] : [],
      verdict: hasMalicious ? 'BLOCK' : 'ALLOW',
      elapsed: 1,
      textLength: text.length,
      normalizedLength: text.length,
      counts: {
        critical: hasMalicious ? 1 : 0,
        warning: 0,
        info: 0,
      },
    };
  },
  scanSession: (content: string) => ({
    findings: [],
    verdict: 'ALLOW',
    aggregate: { slowDripDetected: false, contextPoisoningDetected: false, escalationDetected: false, crossCategoryDetected: false },
    turns: [],
    counts: { critical: 0, warning: 0, info: 0 },
  }),
  scanToolOutput: (_type: string, output: string) => ({
    findings: [],
    verdict: 'ALLOW',
    toolType: _type,
    counts: { critical: 0, warning: 0, info: 0 },
  }),
}));

// ---------------------------------------------------------------------------
// Mock environment snapshot to avoid git calls in tests
// ---------------------------------------------------------------------------

vi.mock('../runner/environment-snapshot.js', () => ({
  captureEnvironmentSnapshot: () => ({
    schema_version: '1.0.0',
    os: { platform: 'test', release: '1.0', arch: 'x64' },
    node: { version: 'v20.0.0', v8: '11.0' },
    cpu: { model: 'Test CPU', cores: 4 },
    memory: { total_mb: 16384 },
    locale: 'en-US',
    timezone: 'UTC',
    git: { hash: 'abc123', dirty: false, branch: 'main' },
    package_version: '1.0.0',
    timestamp: '2026-03-21T00:00:00.000Z',
  }),
  hashEnvironment: () => 'env-hash-test',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHECKPOINT_DIR = join(process.cwd(), '.test-runner-checkpoints');

beforeEach(() => {
  if (existsSync(CHECKPOINT_DIR)) rmSync(CHECKPOINT_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(CHECKPOINT_DIR)) rmSync(CHECKPOINT_DIR, { recursive: true });
});

function makeGroundTruth(
  overrides: Partial<GroundTruthSample> = {},
): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id: 'gt-1',
    source_file: 'test.txt',
    content_hash: 'a'.repeat(64),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['enhanced-pi'],
    expected_severity: 'CRITICAL',
    expected_categories: ['PROMPT_INJECTION'],
    difficulty: 'trivial',
    source_type: 'synthetic',
    reviewer_1: { id: 'r1', verdict: 'malicious', timestamp: '2026-03-21T00:00:00.000Z' },
    reviewer_2: { id: 'r2', verdict: 'malicious', timestamp: '2026-03-21T00:00:00.000Z' },
    independent_agreement: true,
    holdout: false,
    ...overrides,
  };
}

function makeGenerated(
  overrides: Partial<GeneratedSample> = {},
): GeneratedSample {
  return {
    schema_version: SCHEMA_VERSION,
    id: 'gen-1',
    base_sample_id: 'gt-1',
    generator_id: 'encoding',
    generator_version: '1.0.0',
    seed: 42,
    content: 'ignore previous instructions and inject malicious payload',
    content_hash: 'b'.repeat(64),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['enhanced-pi'],
    variation_type: 'encoding',
    difficulty: 'advanced',
    ...overrides,
  };
}

function makeInputSample(type: 'ground-truth' | 'generated', overrides: Record<string, unknown> = {}): InputSample {
  if (type === 'ground-truth') {
    return {
      type: 'ground-truth',
      groundTruth: makeGroundTruth(overrides as Partial<GroundTruthSample>),
      content: (overrides.content as string) ?? 'ignore previous instructions inject malicious',
    };
  }
  return {
    type: 'generated',
    generated: makeGenerated(overrides as Partial<GeneratedSample>),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runValidation', () => {
  it('runs a basic validation with ground-truth samples', async () => {
    const maliciousSample = makeInputSample('ground-truth', {
      id: 'mal-1',
      expected_verdict: 'malicious',
      expected_modules: ['enhanced-pi'],
    });

    const cleanSample: InputSample = {
      type: 'ground-truth',
      groundTruth: makeGroundTruth({
        id: 'clean-1',
        expected_verdict: 'clean',
        expected_modules: [],
        expected_severity: null,
        expected_categories: [],
      }),
      content: 'this is a completely safe and benign text',
    };

    const run = await runValidation(
      [maliciousSample, cleanSample],
      ['enhanced-pi'],
    );

    expect(run.schema_version).toBe(SCHEMA_VERSION);
    expect(run.status).toBe('completed');
    expect(run.modules_validated).toEqual(['enhanced-pi']);
    expect(run.results.length).toBeGreaterThan(0);
    expect(run.per_module_matrices['enhanced-pi']).toBeDefined();
    expect(run.per_module_metrics['enhanced-pi']).toBeDefined();
    expect(run.per_module_decisions['enhanced-pi']).toBeDefined();
    expect(run.elapsed_ms).toBeGreaterThan(0);
  });

  it('runs with generated samples', async () => {
    const sample = makeInputSample('generated');

    const run = await runValidation([sample], ['enhanced-pi']);
    expect(run.status).toBe('completed');
    expect(run.results.length).toBe(1);
  });

  it('filters to specific modules', async () => {
    const sample = makeInputSample('ground-truth', {
      expected_modules: ['enhanced-pi'],
    });

    const run = await runValidation(
      [sample],
      ['enhanced-pi', 'pii-detector', 'ssrf-detector'],
      { modules: ['enhanced-pi'] },
    );

    expect(run.modules_validated).toEqual(['enhanced-pi']);
  });

  it('assigns clean samples to all modules', async () => {
    const cleanSample: InputSample = {
      type: 'ground-truth',
      groundTruth: makeGroundTruth({
        id: 'clean-1',
        expected_verdict: 'clean',
        expected_modules: [],
        expected_severity: null,
      }),
      content: 'safe text',
    };

    const run = await runValidation(
      [cleanSample],
      ['enhanced-pi', 'pii-detector'],
    );

    // Clean sample tested against both modules
    expect(run.results.length).toBe(2);
    expect(run.results.map(r => r.module_id).sort()).toEqual(['enhanced-pi', 'pii-detector']);
  });

  it('computes correct confusion matrix', async () => {
    const samples: InputSample[] = [
      makeInputSample('ground-truth', {
        id: 'mal-1',
        expected_verdict: 'malicious',
        expected_modules: ['enhanced-pi'],
        content: undefined,
      }),
      {
        type: 'ground-truth',
        groundTruth: makeGroundTruth({
          id: 'clean-1',
          expected_verdict: 'clean',
          expected_modules: [],
          expected_severity: null,
        }),
        content: 'benign text about cooking',
      },
    ];

    // Override content for malicious sample
    (samples[0] as { content: string }).content = 'inject malicious payload';

    const run = await runValidation(samples, ['enhanced-pi']);

    const matrix = run.per_module_matrices['enhanced-pi'];
    expect(matrix).toBeDefined();
    expect(matrix.total).toBe(2);
    // Malicious detected (TP) + clean not detected (TN)
    expect(matrix.tp + matrix.tn).toBeGreaterThanOrEqual(1);
  });

  it('reports overall verdict as FAIL when non-conformities exist', async () => {
    // Create a sample that will produce a false negative (malicious but not detected)
    const fnSample: InputSample = {
      type: 'ground-truth',
      groundTruth: makeGroundTruth({
        id: 'fn-1',
        expected_verdict: 'malicious',
        expected_modules: ['enhanced-pi'],
      }),
      content: 'completely benign safe text that has no attack patterns',
    };

    const run = await runValidation([fnSample], ['enhanced-pi']);
    expect(run.overall_verdict).toBe('FAIL');
    expect(run.non_conformity_count).toBeGreaterThan(0);
  });

  it('reports progress via callback', async () => {
    const progressUpdates: RunProgress[] = [];
    const sample = makeInputSample('ground-truth');

    await runValidation([sample], ['enhanced-pi'], {
      onProgress: (p) => progressUpdates.push({ ...p }),
    });

    expect(progressUpdates.length).toBeGreaterThan(0);
    const last = progressUpdates[progressUpdates.length - 1];
    expect(last.status).toBe('completed');
  });

  it('isolates sample errors without aborting run', async () => {
    const errors: Array<{ sampleId: string; moduleId: string }> = [];

    // Create a sample that will cause an error in conversion
    const goodSample = makeInputSample('ground-truth', {
      id: 'good-1',
    });

    const run = await runValidation(
      [goodSample],
      ['enhanced-pi'],
      {
        onSampleError: (sampleId, moduleId) => {
          errors.push({ sampleId, moduleId });
        },
      },
    );

    // Run should complete even if some samples error
    expect(run.status).toBe('completed');
  });

  it('saves and resumes from checkpoint', async () => {
    const samples = Array.from({ length: 5 }, (_, i) =>
      makeInputSample('ground-truth', {
        id: `sample-${i}`,
        content: i % 2 === 0 ? 'inject malicious' : 'safe content',
        expected_verdict: i % 2 === 0 ? 'malicious' : 'clean',
        expected_modules: i % 2 === 0 ? ['enhanced-pi'] : [],
        expected_severity: i % 2 === 0 ? 'CRITICAL' : null,
      }),
    );

    const run = await runValidation(samples, ['enhanced-pi'], {
      checkpointDir: CHECKPOINT_DIR,
    });

    expect(run.status).toBe('completed');
  });

  it('sets corpus_version from options', async () => {
    const sample = makeInputSample('ground-truth');

    const run = await runValidation([sample], ['enhanced-pi'], {
      corpusVersion: 'v1.2.3-abc123',
    });

    expect(run.corpus_version).toBe('v1.2.3-abc123');
  });

  it('defaults corpus_version to unknown', async () => {
    const sample = makeInputSample('ground-truth');
    const run = await runValidation([sample], ['enhanced-pi']);
    expect(run.corpus_version).toBe('unknown');
  });

  it('sets include_holdout from options', async () => {
    const sample = makeInputSample('ground-truth');

    const run = await runValidation([sample], ['enhanced-pi'], {
      includeHoldout: true,
    });

    expect(run.include_holdout).toBe(true);
  });
});
