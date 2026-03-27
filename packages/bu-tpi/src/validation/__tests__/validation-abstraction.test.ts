/**
 * KATANA Validation Abstraction Layer Tests (K3.5)
 *
 * Tests entry point detection, sample conversion, and the routing logic
 * for scan/scanBinary/scanSession/scanToolOutput.
 *
 * ISO 17025 Clause 7.2.2
 */

// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockScan = vi.fn(() => ({
  verdict: 'ALLOW',
  findings: [],
}));

const mockScanSession = vi.fn(() => ({
  verdict: 'ALLOW',
  findings: [],
}));

const mockScanToolOutput = vi.fn(() => ({
  verdict: 'ALLOW',
  findings: [],
}));

const mockScanBinary = vi.fn(async () => ({
  verdict: 'BLOCK',
  findings: [
    {
      category: 'document-pdf',
      severity: 'CRITICAL',
      engine: 'document-pdf',
      source: 'S10',
    },
  ],
}));

vi.mock('../../scanner.js', () => ({
  scan: mockScan,
  scanSession: mockScanSession,
  scanToolOutput: mockScanToolOutput,
}));

vi.mock('../../scanner-binary.js', () => ({
  scanBinary: mockScanBinary,
}));

import {
  detectEntryPoint,
  validateSample,
  toValidationSample,
  generatedToValidationSample,
  type ValidationSample,
} from '../runner/validation-abstraction.js';
import { SCHEMA_VERSION, type GroundTruthSample, type GeneratedSample } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSample(overrides: Partial<ValidationSample> = {}): ValidationSample {
  return {
    id: 'test-sample-1',
    content: 'test content',
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['core-patterns'],
    expected_severity: 'CRITICAL',
    expected_categories: ['PROMPT_INJECTION'],
    ...overrides,
  };
}

function makeGroundTruth(overrides: Partial<GroundTruthSample> = {}): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id: 'gt-sample-1',
    source_file: 'fixtures/test.txt',
    content_hash: 'a'.repeat(64),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['core-patterns'],
    expected_severity: 'CRITICAL',
    expected_categories: ['PROMPT_INJECTION'],
    difficulty: 'trivial',
    source_type: 'synthetic',
    reviewer_1: { id: 'auto', verdict: 'malicious', timestamp: '2026-01-01T00:00:00.000Z' },
    reviewer_2: { id: 'auto', verdict: 'malicious', timestamp: '2026-01-01T00:00:00.000Z' },
    independent_agreement: true,
    holdout: false,
    ...overrides,
  };
}

function makeGenerated(overrides: Partial<GeneratedSample> = {}): GeneratedSample {
  return {
    schema_version: SCHEMA_VERSION,
    id: 'gt-1::encoding::0',
    base_sample_id: 'gt-1',
    generator_id: 'encoding-variations',
    generator_version: '1.0.0',
    seed: 42,
    content: 'encoded content',
    content_hash: 'b'.repeat(64),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['encoding-engine'],
    variation_type: 'encoding',
    difficulty: 'moderate',
    ...overrides,
  };
}

let tempDir: string | null = null;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

// ---------------------------------------------------------------------------
// Entry Point Detection
// ---------------------------------------------------------------------------

describe('detectEntryPoint', () => {
  it('routes text content to scan', () => {
    const sample = makeSample({ content_type: 'text' });
    expect(detectEntryPoint(sample)).toBe('scan');
  });

  it('routes binary content to scanBinary', () => {
    const sample = makeSample({ content_type: 'binary' });
    expect(detectEntryPoint(sample)).toBe('scanBinary');
  });

  it('routes multi-turn variation to scanSession', () => {
    const sample = makeSample({ variation_type: 'multi-turn' });
    expect(detectEntryPoint(sample)).toBe('scanSession');
  });

  it('routes indirect-injection variation to scanToolOutput', () => {
    const sample = makeSample({ variation_type: 'indirect-injection' });
    expect(detectEntryPoint(sample)).toBe('scanToolOutput');
  });

  it('routes encoding variation to scan (default text)', () => {
    const sample = makeSample({ variation_type: 'encoding' });
    expect(detectEntryPoint(sample)).toBe('scan');
  });

  it('routes unicode variation to scan (default text)', () => {
    const sample = makeSample({ variation_type: 'unicode' });
    expect(detectEntryPoint(sample)).toBe('scan');
  });

  it('routes structural variation to scan', () => {
    const sample = makeSample({ variation_type: 'structural' });
    expect(detectEntryPoint(sample)).toBe('scan');
  });

  it('routes combination variation to scan', () => {
    const sample = makeSample({ variation_type: 'combination' });
    expect(detectEntryPoint(sample)).toBe('scan');
  });

  it('binary content takes precedence over variation_type', () => {
    const sample = makeSample({ content_type: 'binary', variation_type: 'multi-turn' });
    expect(detectEntryPoint(sample)).toBe('scanBinary');
  });
});

// ---------------------------------------------------------------------------
// Sample Conversion
// ---------------------------------------------------------------------------

describe('toValidationSample', () => {
  it('converts GroundTruthSample to ValidationSample', () => {
    const gt = makeGroundTruth();
    const result = toValidationSample(gt, 'the actual content');

    expect(result.id).toBe('gt-sample-1');
    expect(result.content).toBe('the actual content');
    expect(result.content_type).toBe('text');
    expect(result.expected_verdict).toBe('malicious');
    expect(result.expected_modules).toEqual(['core-patterns']);
    expect(result.expected_severity).toBe('CRITICAL');
    expect(result.expected_categories).toEqual(['PROMPT_INJECTION']);
    expect(result.variation_type).toBeUndefined();
  });

  it('handles clean samples', () => {
    const gt = makeGroundTruth({
      expected_verdict: 'clean',
      expected_severity: null,
      expected_categories: [],
      expected_modules: [],
    });
    const result = toValidationSample(gt, 'benign content');

    expect(result.expected_verdict).toBe('clean');
    expect(result.expected_severity).toBeNull();
    expect(result.expected_categories).toEqual([]);
  });

  it('handles binary samples', () => {
    const gt = makeGroundTruth({ content_type: 'binary' });
    const result = toValidationSample(gt, 'binary data');

    expect(result.content_type).toBe('binary');
  });
});

describe('generatedToValidationSample', () => {
  it('converts GeneratedSample to ValidationSample', () => {
    const gen = makeGenerated();
    const result = generatedToValidationSample(gen);

    expect(result.id).toBe('gt-1::encoding::0');
    expect(result.content).toBe('encoded content');
    expect(result.content_type).toBe('text');
    expect(result.expected_verdict).toBe('malicious');
    expect(result.expected_modules).toEqual(['encoding-engine']);
    expect(result.expected_severity).toBeNull();
    expect(result.expected_categories).toEqual([]);
    expect(result.variation_type).toBe('encoding');
  });

  it('preserves multi-turn variation type', () => {
    const gen = makeGenerated({ variation_type: 'multi-turn' });
    const result = generatedToValidationSample(gen);

    expect(result.variation_type).toBe('multi-turn');
    expect(detectEntryPoint(result)).toBe('scanSession');
  });

  it('preserves indirect-injection variation type', () => {
    const gen = makeGenerated({ variation_type: 'indirect-injection' });
    const result = generatedToValidationSample(gen);

    expect(result.variation_type).toBe('indirect-injection');
    expect(detectEntryPoint(result)).toBe('scanToolOutput');
  });

  it('preserves binary content type', () => {
    const gen = makeGenerated({ content_type: 'binary' });
    const result = generatedToValidationSample(gen);

    expect(result.content_type).toBe('binary');
    expect(detectEntryPoint(result)).toBe('scanBinary');
  });

  it('handles clean generated samples', () => {
    const gen = makeGenerated({
      expected_verdict: 'clean',
      expected_modules: [],
    });
    const result = generatedToValidationSample(gen);

    expect(result.expected_verdict).toBe('clean');
    expect(result.expected_modules).toEqual([]);
  });
});

describe('validateSample', () => {
  it('uses scanBinary with the on-disk file for file-backed binary corpus samples', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'katana-binary-'));
    const binaryPath = join(tempDir, 'sample.pdf');
    writeFileSync(binaryPath, Buffer.from('fake-pdf-content'));

    const sample = makeSample({
      id: 'binary-file-sample',
      content_type: 'binary',
      content: `__BINARY_FILE__:${binaryPath}`,
      expected_modules: ['document-pdf'],
      expected_categories: ['document-pdf'],
    });

    const result = await validateSample(sample, 'document-pdf');

    expect(mockScanBinary).toHaveBeenCalledTimes(1);
    expect(mockScanBinary).toHaveBeenCalledWith(
      expect.any(Buffer),
      'sample.pdf',
    );
    expect(result.actual_verdict).toBe('malicious');
    expect(result.correct).toBe(true);
    expect(result.actual_categories).toEqual(['document-pdf']);
    expect(result.actual_findings_count).toBe(1);
  });

  it('credits legacy core-patterns engine aliases except document-office findings', async () => {
    mockScan.mockReturnValueOnce({
      verdict: 'BLOCK',
      findings: [
        {
          category: 'CONTEXT_OVERLOAD',
          severity: 'WARNING',
          engine: 'TPI',
          source: 'TPI-11',
        },
      ],
    });

    const result = await validateSample(makeSample(), 'core-patterns');

    expect(result.actual_verdict).toBe('malicious');
    expect(result.correct).toBe(true);
    expect(result.actual_findings_count).toBe(1);
  });

  it('does not credit document-office TPI findings to core-patterns', async () => {
    mockScan.mockReturnValueOnce({
      verdict: 'BLOCK',
      findings: [
        {
          category: 'OFFICE_MACRO_THREAT',
          severity: 'CRITICAL',
          engine: 'TPI',
          source: 'TPI-S11',
        },
      ],
    });

    const result = await validateSample(makeSample(), 'core-patterns');

    expect(result.actual_verdict).toBe('clean');
    expect(result.correct).toBe(false);
    expect(result.actual_findings_count).toBe(0);
  });
});
