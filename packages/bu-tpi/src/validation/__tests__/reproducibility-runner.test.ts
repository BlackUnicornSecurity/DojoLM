/**
 * KATANA Reproducibility Study Tests (K5.2)
 *
 * ISO 17025 Clause: 7.2.2 — Reproducibility
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeReproducibility,
  analyzeAllReproducibility,
  allReproducibilityPassed,
  generateDockerfile,
  generateCIWorkflow,
  ENVIRONMENT_MATRIX,
  type EnvironmentRunResult,
} from '../runner/reproducibility-runner.js';
import { SCHEMA_VERSION, type ValidationResult } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    schema_version: SCHEMA_VERSION,
    sample_id: 'sample-001',
    module_id: 'test-module',
    expected_verdict: 'malicious',
    actual_verdict: 'malicious',
    correct: true,
    actual_severity: 'CRITICAL',
    actual_categories: ['injection'],
    actual_findings_count: 1,
    elapsed_ms: 10,
    ...overrides,
  };
}

function makeEnvResult(label: string, results: ValidationResult[]): EnvironmentRunResult {
  return {
    environment: { label, os: 'linux', arch: 'x64', node_version: '22.x' },
    results,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('K5.2 — Reproducibility Study', () => {
  describe('ENVIRONMENT_MATRIX', () => {
    it('should define at least 6 environment targets', () => {
      expect(ENVIRONMENT_MATRIX.length).toBeGreaterThanOrEqual(6);
    });

    it('should include macOS arm64', () => {
      const macArm = ENVIRONMENT_MATRIX.filter(e => e.os === 'darwin' && e.arch === 'arm64');
      expect(macArm.length).toBeGreaterThanOrEqual(1);
    });

    it('should include Linux x64 and arm64', () => {
      const linuxX64 = ENVIRONMENT_MATRIX.filter(e => e.os === 'linux' && e.arch === 'x64');
      const linuxArm64 = ENVIRONMENT_MATRIX.filter(e => e.os === 'linux' && e.arch === 'arm64');
      expect(linuxX64.length).toBeGreaterThanOrEqual(1);
      expect(linuxArm64.length).toBeGreaterThanOrEqual(1);
    });

    it('should include multiple Node.js versions', () => {
      const nodeVersions = new Set(ENVIRONMENT_MATRIX.map(e => e.node_version));
      expect(nodeVersions.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('analyzeReproducibility', () => {
    it('should pass when all environments agree', () => {
      const results = [makeResult({ sample_id: 's1' })];
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('linux-x64', [...results]),
        makeEnvResult('macos-arm64', [...results]),
      ];

      const result = analyzeReproducibility('test-module', envResults);

      expect(result.verdict).toBe('PASS');
      expect(result.cross_env_agreement).toBe(true);
      expect(result.disagreement_count).toBe(0);
      expect(result.module_id).toBe('test-module');
      expect(result.environments.length).toBe(2);
      expect(result.schema_version).toBe(SCHEMA_VERSION);
    });

    it('should fail when verdicts disagree across environments', () => {
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('linux-x64', [makeResult({ sample_id: 's1', actual_verdict: 'malicious' })]),
        makeEnvResult('macos-arm64', [makeResult({ sample_id: 's1', actual_verdict: 'clean' })]),
      ];

      const result = analyzeReproducibility('test-module', envResults);

      expect(result.verdict).toBe('FAIL');
      expect(result.cross_env_agreement).toBe(false);
      expect(result.disagreement_samples.some(d => d.field === 'actual_verdict')).toBe(true);
    });

    it('should fail when severity disagrees across environments', () => {
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('env-1', [makeResult({ sample_id: 's1', actual_severity: 'CRITICAL' })]),
        makeEnvResult('env-2', [makeResult({ sample_id: 's1', actual_severity: 'WARNING' })]),
      ];

      const result = analyzeReproducibility('test-module', envResults);

      expect(result.verdict).toBe('FAIL');
      expect(result.disagreement_samples.some(d => d.field === 'actual_severity')).toBe(true);
    });

    it('should fail when categories disagree across environments', () => {
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('env-1', [makeResult({ sample_id: 's1', actual_categories: ['injection'] })]),
        makeEnvResult('env-2', [makeResult({ sample_id: 's1', actual_categories: ['xss'] })]),
      ];

      const result = analyzeReproducibility('test-module', envResults);

      expect(result.verdict).toBe('FAIL');
      expect(result.disagreement_samples.some(d => d.field === 'actual_categories')).toBe(true);
    });

    it('should fail when findings_count disagrees across environments', () => {
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('env-1', [makeResult({ sample_id: 's1', actual_findings_count: 1 })]),
        makeEnvResult('env-2', [makeResult({ sample_id: 's1', actual_findings_count: 2 })]),
      ];

      const result = analyzeReproducibility('test-module', envResults);

      expect(result.verdict).toBe('FAIL');
      expect(result.disagreement_samples.some(d => d.field === 'actual_findings_count')).toBe(true);
    });

    it('should detect samples missing in some environments', () => {
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('env-1', [makeResult({ sample_id: 's1' }), makeResult({ sample_id: 's2' })]),
        makeEnvResult('env-2', [makeResult({ sample_id: 's1' })]),
      ];

      const result = analyzeReproducibility('test-module', envResults);

      expect(result.verdict).toBe('FAIL');
      expect(result.disagreement_count).toBeGreaterThan(0);
    });

    it('should include env_values in disagreement records', () => {
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('env-A', [makeResult({ sample_id: 's1', actual_verdict: 'malicious' })]),
        makeEnvResult('env-B', [makeResult({ sample_id: 's1', actual_verdict: 'clean' })]),
      ];

      const result = analyzeReproducibility('test-module', envResults);

      const disagreement = result.disagreement_samples.find(d => d.field === 'actual_verdict');
      expect(disagreement).toBeDefined();
      expect(disagreement!.env_values['env-A']).toBe('malicious');
      expect(disagreement!.env_values['env-B']).toBe('clean');
    });

    it('should throw for empty moduleId', () => {
      expect(() => analyzeReproducibility('', [])).toThrow('moduleId must be non-empty');
    });

    it('should throw for fewer than 2 environments', () => {
      expect(() => analyzeReproducibility('test', [makeEnvResult('env-1', [])])).toThrow('at least 2');
    });

    it('should handle multiple environments (3+)', () => {
      const results = [makeResult({ sample_id: 's1' })];
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('env-1', [...results]),
        makeEnvResult('env-2', [...results]),
        makeEnvResult('env-3', [...results]),
      ];

      const result = analyzeReproducibility('test-module', envResults);

      expect(result.verdict).toBe('PASS');
      expect(result.environments.length).toBe(3);
    });

    it('should include timestamp', () => {
      const envResults: EnvironmentRunResult[] = [
        makeEnvResult('env-1', []),
        makeEnvResult('env-2', []),
      ];

      const result = analyzeReproducibility('test-module', envResults);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('analyzeAllReproducibility', () => {
    it('should analyze multiple modules', () => {
      const results = [makeResult({ sample_id: 's1' })];
      const modules = new Map([
        ['mod-a', [makeEnvResult('env-1', [...results]), makeEnvResult('env-2', [...results])]],
        ['mod-b', [makeEnvResult('env-1', [...results]), makeEnvResult('env-2', [...results])]],
      ]);

      const allResults = analyzeAllReproducibility(modules);

      expect(allResults.size).toBe(2);
      expect(allResults.get('mod-a')?.verdict).toBe('PASS');
      expect(allResults.get('mod-b')?.verdict).toBe('PASS');
    });
  });

  describe('allReproducibilityPassed', () => {
    it('should return true when all pass', () => {
      const results = new Map([
        ['mod-a', { verdict: 'PASS' as const }],
        ['mod-b', { verdict: 'PASS' as const }],
      ]);
      expect(allReproducibilityPassed(results as any)).toBe(true);
    });

    it('should return false when any fails', () => {
      const results = new Map([
        ['mod-a', { verdict: 'PASS' as const }],
        ['mod-b', { verdict: 'FAIL' as const }],
      ]);
      expect(allReproducibilityPassed(results as any)).toBe(false);
    });

    it('should return false for empty map', () => {
      expect(allReproducibilityPassed(new Map())).toBe(false);
    });
  });

  describe('generateDockerfile', () => {
    it('should generate valid Dockerfile content', () => {
      const env = ENVIRONMENT_MATRIX[0];
      const dockerfile = generateDockerfile(env);

      expect(dockerfile).toContain('FROM');
      expect(dockerfile).toContain('node:');
      expect(dockerfile).toContain('WORKDIR /app');
      expect(dockerfile).toContain('npm ci');
      expect(dockerfile).toContain(env.label);
    });

    it('should set correct platform for arm64', () => {
      const armEnv = ENVIRONMENT_MATRIX.find(e => e.arch === 'arm64')!;
      const dockerfile = generateDockerfile(armEnv);
      expect(dockerfile).toContain('linux/arm64');
    });

    it('should set correct platform for x64', () => {
      const x64Env = ENVIRONMENT_MATRIX.find(e => e.arch === 'x64')!;
      const dockerfile = generateDockerfile(x64Env);
      expect(dockerfile).toContain('linux/amd64');
    });
  });

  describe('generateCIWorkflow', () => {
    it('should generate valid YAML workflow', () => {
      const workflow = generateCIWorkflow();

      expect(workflow).toContain('name: katana-reproducibility');
      expect(workflow).toContain('strategy:');
      expect(workflow).toContain('matrix:');
      expect(workflow).toContain('actions/checkout@v4');
      expect(workflow).toContain('actions/setup-node@v4');
      expect(workflow).toContain('compare:');
    });
  });
});
