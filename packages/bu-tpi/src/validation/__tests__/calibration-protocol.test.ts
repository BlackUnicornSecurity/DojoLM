/**
 * KATANA Calibration Protocol Tests (K4.2)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calibrateModule,
  calibrateAll,
  signCertificate,
  verifyCertificate,
  checkCalibrationValidity,
  checkAllCalibrationValidity,
  allCalibrationsValid,
  type ScanFunction,
} from '../calibration/calibration-protocol.js';
import type { ReferenceSet } from '../calibration/reference-sets.js';
import {
  generateSigningKeyPair,
} from '../integrity/certificate-signer.js';
import { SCHEMA_VERSION, type EnvironmentSnapshot, type CalibrationCertificate } from '../types.js';
import { INTEGRITY_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const TEST_HMAC_KEY = 'e'.repeat(64);
const { privateKey: TEST_PRIVATE_KEY, publicKey: TEST_PUBLIC_KEY } = generateSigningKeyPair();

const originalHmacKey = process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];
const originalSignKey = process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR];
const originalVerifyKey = process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR];

beforeEach(() => {
  process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR] = TEST_HMAC_KEY;
  process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR] = TEST_PRIVATE_KEY;
  process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR] = TEST_PUBLIC_KEY;
});

afterEach(() => {
  const restore = (key: string, original: string | undefined) => {
    if (original !== undefined) process.env[key] = original;
    else delete process.env[key];
  };
  restore(INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR, originalHmacKey);
  restore(INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR, originalSignKey);
  restore(INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR, originalVerifyKey);
});

function makeEnvironment(): EnvironmentSnapshot {
  return {
    schema_version: SCHEMA_VERSION,
    os: { platform: 'darwin', release: '23.0.0', arch: 'arm64' },
    node: { version: 'v20.11.0', v8: '11.3.244.8' },
    cpu: { model: 'Apple M2', cores: 8 },
    memory: { total_mb: 16384 },
    locale: 'en-US',
    timezone: 'America/New_York',
    git: { hash: 'abc123', dirty: false, branch: 'main' },
    package_version: '1.0.0',
    timestamp: '2026-03-21T12:00:00.000Z',
  };
}

function makeSample(id: string, verdict: 'clean' | 'malicious', modules: string[] = []) {
  return {
    schema_version: SCHEMA_VERSION as '1.0.0',
    id,
    source_file: `fixtures/${id}.txt`,
    content_hash: 'a'.repeat(64),
    content_type: 'text' as const,
    expected_verdict: verdict,
    expected_modules: modules,
    expected_severity: verdict === 'malicious' ? 'CRITICAL' as const : null,
    expected_categories: verdict === 'malicious' ? ['PROMPT_INJECTION'] : [],
    difficulty: 'moderate' as const,
    source_type: 'synthetic' as const,
    reviewer_1: { id: 'r1', verdict, timestamp: '2026-03-21T00:00:00.000Z' },
    reviewer_2: { id: 'r2', verdict, timestamp: '2026-03-21T00:00:00.000Z' },
    independent_agreement: true,
    holdout: false,
  };
}

function makeReferenceSet(moduleId: string, posCount: number = 10, negCount: number = 10): ReferenceSet {
  return {
    module_id: moduleId,
    positive_samples: Array.from({ length: posCount }, (_, i) =>
      makeSample(`${moduleId}-pos-${i}`, 'malicious', [moduleId]),
    ),
    negative_samples: Array.from({ length: negCount }, (_, i) =>
      makeSample(`${moduleId}-neg-${i}`, 'clean'),
    ),
    version: `ref-v1-${moduleId}-54321`,
  };
}

// Perfect scanner: returns correct verdict for all samples
const perfectScan: ScanFunction = (content, moduleId) => {
  // If sample ID contains 'pos' it's malicious, 'neg' it's clean
  const isPositive = content.includes('-pos-');
  return { verdict: isPositive ? 'malicious' : 'clean' };
};

// Broken scanner: always says clean
const brokenScan: ScanFunction = () => ({ verdict: 'clean' });

// ---------------------------------------------------------------------------
// K4.2 — Module Calibration
// ---------------------------------------------------------------------------

describe('K4.2 — Module Calibration', () => {
  it('PASS when all samples correctly classified', () => {
    const refSet = makeReferenceSet('enhanced-pi');
    const result = calibrateModule(refSet, perfectScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'abc123',
      contentLoader: (sampleId) => sampleId, // Use sample ID as content proxy
    });

    expect(result.certificate.result).toBe('PASS');
    expect(result.certificate.samples_tested).toBe(20);
    expect(result.certificate.samples_passed).toBe(20);
    expect(result.details).toHaveLength(20);
    expect(result.details.every(d => d.correct)).toBe(true);
  });

  it('FAIL when some samples misclassified', () => {
    const refSet = makeReferenceSet('enhanced-pi');
    const result = calibrateModule(refSet, brokenScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'abc123',
      contentLoader: (sampleId) => sampleId,
    });

    expect(result.certificate.result).toBe('FAIL');
    expect(result.certificate.samples_passed).toBe(10); // Only negatives correct
    expect(result.certificate.samples_tested).toBe(20);
  });

  it('generates valid certificate with required fields', () => {
    const refSet = makeReferenceSet('mcp-parser');
    const result = calibrateModule(refSet, perfectScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'def456',
      contentLoader: (sampleId) => sampleId,
    });

    const cert = result.certificate;
    expect(cert.schema_version).toBe(SCHEMA_VERSION);
    expect(cert.certificate_id).toMatch(/^cal-/);
    expect(cert.module_id).toBe('mcp-parser');
    expect(cert.tool_build_hash).toBe('def456');
    expect(cert.reference_set_version).toBe('ref-v1-mcp-parser-54321');
    expect(cert.timestamp).toBeDefined();
  });

  it('records per-sample details', () => {
    const refSet = makeReferenceSet('enhanced-pi');
    const result = calibrateModule(refSet, perfectScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'abc123',
      contentLoader: (sampleId) => sampleId,
    });

    // Check detail structure
    const detail = result.details[0];
    expect(detail.sample_id).toBeDefined();
    expect(['clean', 'malicious']).toContain(detail.expected_verdict);
    expect(['clean', 'malicious']).toContain(detail.actual_verdict);
    expect(typeof detail.correct).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// K4.2 — Batch Calibration
// ---------------------------------------------------------------------------

describe('K4.2 — Batch Calibration', () => {
  it('calibrates all modules when all pass', () => {
    const refSets = [
      makeReferenceSet('enhanced-pi'),
      makeReferenceSet('mcp-parser'),
    ];
    const results = calibrateAll(refSets, perfectScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'abc123',
      contentLoader: (sampleId) => sampleId,
    });

    expect(results.size).toBe(2);
    expect(results.get('enhanced-pi')!.certificate.result).toBe('PASS');
    expect(results.get('mcp-parser')!.certificate.result).toBe('PASS');
  });

  it('aborts on first FAIL — does not continue to remaining modules', () => {
    const refSets = [
      makeReferenceSet('enhanced-pi'),
      makeReferenceSet('mcp-parser'),
      makeReferenceSet('third-module'),
    ];
    // brokenScan always returns clean, so positives will fail
    const results = calibrateAll(refSets, brokenScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'abc123',
      contentLoader: (sampleId) => sampleId,
    });

    // Should stop after first module fails
    expect(results.size).toBe(1);
    expect(results.get('enhanced-pi')!.certificate.result).toBe('FAIL');
    expect(results.has('mcp-parser')).toBe(false);
    expect(results.has('third-module')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// K4.2 — Certificate Signing
// ---------------------------------------------------------------------------

describe('K4.2 — Certificate Signing', () => {
  it('signs and verifies certificate', () => {
    const refSet = makeReferenceSet('enhanced-pi');
    const result = calibrateModule(refSet, perfectScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'abc123',
      contentLoader: (sampleId) => sampleId,
    });

    const signed = signCertificate(result.certificate, TEST_PRIVATE_KEY);
    expect(signed.signature).toBeDefined();
    expect(verifyCertificate(signed, TEST_PUBLIC_KEY)).toBe(true);
  });

  it('rejects tampered certificate', () => {
    const refSet = makeReferenceSet('enhanced-pi');
    const result = calibrateModule(refSet, perfectScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'abc123',
      contentLoader: (sampleId) => sampleId,
    });

    const signed = signCertificate(result.certificate, TEST_PRIVATE_KEY);
    const tampered = { ...signed, samples_passed: 0 };
    expect(verifyCertificate(tampered, TEST_PUBLIC_KEY)).toBe(false);
  });

  it('rejects unsigned certificate', () => {
    const refSet = makeReferenceSet('enhanced-pi');
    const result = calibrateModule(refSet, perfectScan, {
      environment: makeEnvironment(),
      tool_build_hash: 'abc123',
      contentLoader: (sampleId) => sampleId,
    });
    expect(verifyCertificate(result.certificate, TEST_PUBLIC_KEY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// K4.2 — Calibration Validity
// ---------------------------------------------------------------------------

describe('K4.2 — Calibration Validity', () => {
  it('valid when build hash matches and result is PASS', () => {
    const cert: CalibrationCertificate = {
      schema_version: SCHEMA_VERSION,
      certificate_id: 'cal-001',
      module_id: 'enhanced-pi',
      tool_build_hash: 'abc123',
      reference_set_version: 'v1',
      environment: makeEnvironment(),
      result: 'PASS',
      samples_tested: 20,
      samples_passed: 20,
      timestamp: '2026-03-21T12:00:00.000Z',
    };

    const validity = checkCalibrationValidity(cert, 'abc123');
    expect(validity.valid).toBe(true);
    expect(validity.reason).toBe('valid');
  });

  it('invalid when build hash changed', () => {
    const cert: CalibrationCertificate = {
      schema_version: SCHEMA_VERSION,
      certificate_id: 'cal-001',
      module_id: 'enhanced-pi',
      tool_build_hash: 'abc123',
      reference_set_version: 'v1',
      environment: makeEnvironment(),
      result: 'PASS',
      samples_tested: 20,
      samples_passed: 20,
      timestamp: '2026-03-21T12:00:00.000Z',
    };

    const validity = checkCalibrationValidity(cert, 'new-hash-456');
    expect(validity.valid).toBe(false);
    expect(validity.reason).toBe('build_hash_mismatch');
  });

  it('invalid when calibration failed', () => {
    const cert: CalibrationCertificate = {
      schema_version: SCHEMA_VERSION,
      certificate_id: 'cal-002',
      module_id: 'enhanced-pi',
      tool_build_hash: 'abc123',
      reference_set_version: 'v1',
      environment: makeEnvironment(),
      result: 'FAIL',
      samples_tested: 20,
      samples_passed: 15,
      timestamp: '2026-03-21T12:00:00.000Z',
    };

    const validity = checkCalibrationValidity(cert, 'abc123');
    expect(validity.valid).toBe(false);
    expect(validity.reason).toBe('calibration_failed');
  });
});

// ---------------------------------------------------------------------------
// K4.2 — Batch Validity Check
// ---------------------------------------------------------------------------

describe('K4.2 — Batch Calibration Validity', () => {
  it('allCalibrationsValid returns true when all valid', () => {
    const certs = new Map<string, CalibrationCertificate>();
    certs.set('mod-a', {
      schema_version: SCHEMA_VERSION, certificate_id: 'c1', module_id: 'mod-a',
      tool_build_hash: 'abc', reference_set_version: 'v1', environment: makeEnvironment(),
      result: 'PASS', samples_tested: 20, samples_passed: 20, timestamp: '2026-03-21T12:00:00.000Z',
    });
    certs.set('mod-b', {
      schema_version: SCHEMA_VERSION, certificate_id: 'c2', module_id: 'mod-b',
      tool_build_hash: 'abc', reference_set_version: 'v1', environment: makeEnvironment(),
      result: 'PASS', samples_tested: 20, samples_passed: 20, timestamp: '2026-03-21T12:00:00.000Z',
    });

    const validities = checkAllCalibrationValidity(certs, 'abc');
    expect(allCalibrationsValid(validities)).toBe(true);
  });

  it('allCalibrationsValid returns false when any invalid', () => {
    const certs = new Map<string, CalibrationCertificate>();
    certs.set('mod-a', {
      schema_version: SCHEMA_VERSION, certificate_id: 'c1', module_id: 'mod-a',
      tool_build_hash: 'abc', reference_set_version: 'v1', environment: makeEnvironment(),
      result: 'PASS', samples_tested: 20, samples_passed: 20, timestamp: '2026-03-21T12:00:00.000Z',
    });
    certs.set('mod-b', {
      schema_version: SCHEMA_VERSION, certificate_id: 'c2', module_id: 'mod-b',
      tool_build_hash: 'old-hash', reference_set_version: 'v1', environment: makeEnvironment(),
      result: 'PASS', samples_tested: 20, samples_passed: 20, timestamp: '2026-03-21T12:00:00.000Z',
    });

    const validities = checkAllCalibrationValidity(certs, 'abc');
    expect(allCalibrationsValid(validities)).toBe(false);
  });

  it('allCalibrationsValid returns false for empty map', () => {
    const validities = new Map();
    expect(allCalibrationsValid(validities)).toBe(false);
  });
});
