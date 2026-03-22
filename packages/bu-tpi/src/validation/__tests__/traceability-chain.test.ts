/**
 * KATANA Traceability Chain Tests (K4.3)
 */

import { describe, it, expect } from 'vitest';
import {
  buildTraceabilityChain,
  buildTraceabilityChains,
  verifyTraceabilityChain,
  hashModuleSource,
  hashConfig,
  getCertificateId,
} from '../runner/traceability-chain.js';
import { SCHEMA_VERSION, type EnvironmentSnapshot, type CalibrationCertificate } from '../types.js';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function makeEnvironment(overrides: Partial<EnvironmentSnapshot> = {}): EnvironmentSnapshot {
  return {
    schema_version: SCHEMA_VERSION,
    os: { platform: 'darwin', release: '23.0.0', arch: 'arm64' },
    node: { version: 'v20.11.0', v8: '11.3.244.8' },
    cpu: { model: 'Apple M2', cores: 8 },
    memory: { total_mb: 16384 },
    locale: 'en-US',
    timezone: 'America/New_York',
    git: { hash: 'abc123def456', dirty: false, branch: 'main' },
    package_version: '1.0.0',
    timestamp: '2026-03-21T12:00:00.000Z',
    ...overrides,
  };
}

const SHARED_INPUT = {
  corpus_version: 'merkle-root-hash-abc123',
  tool_version: '1.0.0',
  tool_build_hash: 'abc123def456',
  module_hash: 'module-source-hash-789',
  calibration_certificate_id: 'cal-cert-001',
  environment: makeEnvironment(),
  config_snapshot: JSON.stringify({ sample_timeout_ms: 30000 }),
};

// ---------------------------------------------------------------------------
// K4.3 — Traceability Chain Construction
// ---------------------------------------------------------------------------

describe('K4.3 — Traceability Chain Construction', () => {
  it('builds a valid traceability chain', () => {
    const chain = buildTraceabilityChain({
      result_id: 'run-001::enhanced-pi::sample-001',
      sample_id: 'sample-001',
      ...SHARED_INPUT,
    });

    expect(chain.schema_version).toBe(SCHEMA_VERSION);
    expect(chain.result_id).toBe('run-001::enhanced-pi::sample-001');
    expect(chain.sample_id).toBe('sample-001');
    expect(chain.corpus_version).toBe('merkle-root-hash-abc123');
    expect(chain.tool_version).toBe('1.0.0');
    expect(chain.tool_build_hash).toBe('abc123def456');
    expect(chain.module_hash).toBe('module-source-hash-789');
    expect(chain.calibration_certificate_id).toBe('cal-cert-001');
    expect(chain.environment_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(chain.config_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces deterministic hashes for same input', () => {
    const chain1 = buildTraceabilityChain({
      result_id: 'run-001::mod::s1',
      sample_id: 's1',
      ...SHARED_INPUT,
    });
    const chain2 = buildTraceabilityChain({
      result_id: 'run-001::mod::s1',
      sample_id: 's1',
      ...SHARED_INPUT,
    });
    expect(chain1.environment_hash).toBe(chain2.environment_hash);
    expect(chain1.config_hash).toBe(chain2.config_hash);
  });

  it('different configs produce different config hashes', () => {
    const chain1 = buildTraceabilityChain({
      result_id: 'r1',
      sample_id: 's1',
      ...SHARED_INPUT,
      config_snapshot: JSON.stringify({ timeout: 1000 }),
    });
    const chain2 = buildTraceabilityChain({
      result_id: 'r1',
      sample_id: 's1',
      ...SHARED_INPUT,
      config_snapshot: JSON.stringify({ timeout: 2000 }),
    });
    expect(chain1.config_hash).not.toBe(chain2.config_hash);
  });

  it('different environments produce different env hashes', () => {
    const chain1 = buildTraceabilityChain({
      result_id: 'r1',
      sample_id: 's1',
      ...SHARED_INPUT,
    });
    const chain2 = buildTraceabilityChain({
      result_id: 'r1',
      sample_id: 's1',
      ...SHARED_INPUT,
      environment: makeEnvironment({ package_version: '2.0.0' }),
    });
    expect(chain1.environment_hash).not.toBe(chain2.environment_hash);
  });
});

// ---------------------------------------------------------------------------
// K4.3 — Batch Chain Construction
// ---------------------------------------------------------------------------

describe('K4.3 — Batch Traceability Chains', () => {
  it('builds chains for multiple results', () => {
    const chains = buildTraceabilityChains(
      ['r1', 'r2', 'r3'],
      ['s1', 's2', 's3'],
      SHARED_INPUT,
    );
    expect(chains).toHaveLength(3);
    expect(chains[0].result_id).toBe('r1');
    expect(chains[0].sample_id).toBe('s1');
    expect(chains[2].result_id).toBe('r3');
    expect(chains[2].sample_id).toBe('s3');
  });

  it('all chains share same env and config hashes', () => {
    const chains = buildTraceabilityChains(
      ['r1', 'r2'],
      ['s1', 's2'],
      SHARED_INPUT,
    );
    expect(chains[0].environment_hash).toBe(chains[1].environment_hash);
    expect(chains[0].config_hash).toBe(chains[1].config_hash);
  });

  it('throws on mismatched array lengths', () => {
    expect(() =>
      buildTraceabilityChains(['r1', 'r2'], ['s1'], SHARED_INPUT),
    ).toThrow('must match');
  });
});

// ---------------------------------------------------------------------------
// K4.3 — Chain Verification
// ---------------------------------------------------------------------------

describe('K4.3 — Traceability Chain Verification', () => {
  it('verifies valid chain', () => {
    const chain = buildTraceabilityChain({
      result_id: 'r1',
      sample_id: 's1',
      ...SHARED_INPUT,
    });

    const result = verifyTraceabilityChain(
      chain,
      SHARED_INPUT.environment,
      SHARED_INPUT.config_snapshot,
    );
    expect(result.environment_hash_valid).toBe(true);
    expect(result.config_hash_valid).toBe(true);
    expect(result.schema_version_valid).toBe(true);
    expect(result.all_valid).toBe(true);
  });

  it('detects environment change', () => {
    const chain = buildTraceabilityChain({
      result_id: 'r1',
      sample_id: 's1',
      ...SHARED_INPUT,
    });

    const differentEnv = makeEnvironment({ package_version: '9.9.9' });
    const result = verifyTraceabilityChain(chain, differentEnv, SHARED_INPUT.config_snapshot);
    expect(result.environment_hash_valid).toBe(false);
    expect(result.all_valid).toBe(false);
  });

  it('detects config change', () => {
    const chain = buildTraceabilityChain({
      result_id: 'r1',
      sample_id: 's1',
      ...SHARED_INPUT,
    });

    const result = verifyTraceabilityChain(
      chain,
      SHARED_INPUT.environment,
      JSON.stringify({ different: true }),
    );
    expect(result.config_hash_valid).toBe(false);
    expect(result.all_valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// K4.3 — Module Hash
// ---------------------------------------------------------------------------

describe('K4.3 — Module Source Hashing', () => {
  it('produces consistent hash for same source', () => {
    const source = 'export function scan(text: string) { return []; }';
    expect(hashModuleSource(source)).toBe(hashModuleSource(source));
  });

  it('produces different hash for different source', () => {
    const hash1 = hashModuleSource('version 1');
    const hash2 = hashModuleSource('version 2');
    expect(hash1).not.toBe(hash2);
  });

  it('returns 64-char hex string', () => {
    expect(hashModuleSource('source')).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// K4.3 — Config Hash
// ---------------------------------------------------------------------------

describe('K4.3 — Config Hashing', () => {
  it('produces consistent hash', () => {
    const config = JSON.stringify({ a: 1, b: 2 });
    expect(hashConfig(config)).toBe(hashConfig(config));
  });

  it('differentiates configs', () => {
    expect(hashConfig('{"a":1}')).not.toBe(hashConfig('{"a":2}'));
  });
});

// ---------------------------------------------------------------------------
// K4.3 — Certificate Lookup
// ---------------------------------------------------------------------------

describe('K4.3 — Certificate ID Lookup', () => {
  it('returns certificate ID when available', () => {
    const certs = new Map<string, CalibrationCertificate>();
    certs.set('enhanced-pi', {
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
    });

    expect(getCertificateId('enhanced-pi', certs)).toBe('cal-001');
  });

  it('returns sentinel for uncalibrated module', () => {
    const certs = new Map<string, CalibrationCertificate>();
    expect(getCertificateId('unknown-module', certs)).toBe('uncalibrated::unknown-module');
  });
});
