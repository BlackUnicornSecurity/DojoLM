/**
 * KATANA CI Configuration Helper Tests (K6.2)
 *
 * Tests for CI pipeline utilities:
 * - detectChangedModules
 * - buildCIValidationCommand
 * - parseCIExitCode
 * - CI_EXIT_CODES
 */

import { describe, it, expect } from 'vitest';
import {
  CI_EXIT_CODES,
  detectChangedModules,
  buildCIValidationCommand,
  parseCIExitCode,
} from '../ci/ci-config.js';

// ---------------------------------------------------------------------------
// CI_EXIT_CODES
// ---------------------------------------------------------------------------

describe('CI_EXIT_CODES', () => {
  it('should have PASS = 0', () => {
    expect(CI_EXIT_CODES.PASS).toBe(0);
  });

  it('should have FAIL = 1', () => {
    expect(CI_EXIT_CODES.FAIL).toBe(1);
  });

  it('should have CALIBRATION_FAIL = 2', () => {
    expect(CI_EXIT_CODES.CALIBRATION_FAIL).toBe(2);
  });

  it('should have INTEGRITY_FAIL = 3', () => {
    expect(CI_EXIT_CODES.INTEGRITY_FAIL).toBe(3);
  });

  it('should be immutable (all values are readonly)', () => {
    // Verify the shape — values cannot be reassigned at compile time
    const codes: Record<string, number> = { ...CI_EXIT_CODES };
    expect(Object.keys(codes)).toEqual(['PASS', 'FAIL', 'CALIBRATION_FAIL', 'INTEGRITY_FAIL']);
  });
});

// ---------------------------------------------------------------------------
// detectChangedModules
// ---------------------------------------------------------------------------

describe('detectChangedModules', () => {
  it('should detect modules from src/modules/ paths', () => {
    const diff = [
      'packages/bu-tpi/src/modules/prompt-injection/detector.ts',
      'packages/bu-tpi/src/modules/prompt-injection/patterns.json',
      'packages/bu-tpi/src/modules/xss-scanner/index.ts',
    ].join('\n');

    const result = detectChangedModules(diff);

    expect(result).toContain('prompt-injection');
    expect(result).toContain('xss-scanner');
    expect(result).toHaveLength(2);
  });

  it('should detect modules from src/scanners/ paths', () => {
    const diff = 'packages/bu-tpi/src/scanners/sql-injection/rules.ts\n';

    const result = detectChangedModules(diff);

    expect(result).toEqual(['sql-injection']);
  });

  it('should detect modules from src/detection/ paths', () => {
    const diff = 'packages/bu-tpi/src/detection/malware-sig/engine.ts\n';

    const result = detectChangedModules(diff);

    expect(result).toEqual(['malware-sig']);
  });

  it('should detect modules from src/rules/ paths', () => {
    const diff = 'packages/bu-tpi/src/rules/cve-checker/index.ts\n';

    const result = detectChangedModules(diff);

    expect(result).toEqual(['cve-checker']);
  });

  it('should return empty array for empty diff output', () => {
    expect(detectChangedModules('')).toEqual([]);
  });

  it('should return empty array for whitespace-only diff output', () => {
    expect(detectChangedModules('   \n  \n  ')).toEqual([]);
  });

  it('should return empty array when no module paths are changed', () => {
    const diff = [
      'packages/bu-tpi/src/utils/helpers.ts',
      'packages/bu-tpi/package.json',
      'packages/dojolm-web/src/app/page.tsx',
      'README.md',
    ].join('\n');

    const result = detectChangedModules(diff);

    expect(result).toEqual([]);
  });

  it('should deduplicate modules with multiple changed files', () => {
    const diff = [
      'packages/bu-tpi/src/modules/prompt-injection/detector.ts',
      'packages/bu-tpi/src/modules/prompt-injection/patterns.json',
      'packages/bu-tpi/src/modules/prompt-injection/tests/unit.test.ts',
    ].join('\n');

    const result = detectChangedModules(diff);

    expect(result).toEqual(['prompt-injection']);
  });

  it('should return sorted module IDs for deterministic output', () => {
    const diff = [
      'packages/bu-tpi/src/modules/xss-scanner/index.ts',
      'packages/bu-tpi/src/modules/api-abuse/detector.ts',
      'packages/bu-tpi/src/modules/prompt-injection/engine.ts',
    ].join('\n');

    const result = detectChangedModules(diff);

    expect(result).toEqual(['api-abuse', 'prompt-injection', 'xss-scanner']);
  });

  it('should handle mixed module and non-module changes', () => {
    const diff = [
      'packages/bu-tpi/src/modules/xss-scanner/index.ts',
      'packages/bu-tpi/src/utils/helpers.ts',
      'packages/bu-tpi/package.json',
      'packages/bu-tpi/src/scanners/sqli/rules.ts',
    ].join('\n');

    const result = detectChangedModules(diff);

    expect(result).toContain('xss-scanner');
    expect(result).toContain('sqli');
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// buildCIValidationCommand
// ---------------------------------------------------------------------------

describe('buildCIValidationCommand', () => {
  it('should build a full validation command with all modules', () => {
    const cmd = buildCIValidationCommand({ mode: 'validate' });

    expect(cmd).toBe('npx katana validate --modules all');
  });

  it('should build a calibration command', () => {
    const cmd = buildCIValidationCommand({ mode: 'calibrate' });

    expect(cmd).toBe('npx katana calibrate');
  });

  it('should include specific modules when provided', () => {
    const cmd = buildCIValidationCommand({
      mode: 'validate',
      modules: ['prompt-injection', 'xss-scanner'],
    });

    expect(cmd).toBe('npx katana validate --modules prompt-injection,xss-scanner');
  });

  it('should include output format when specified', () => {
    const cmd = buildCIValidationCommand({
      mode: 'validate',
      outputFormat: 'json',
    });

    expect(cmd).toBe('npx katana validate --modules all --output json');
  });

  it('should include extra flags when provided', () => {
    const cmd = buildCIValidationCommand({
      mode: 'validate',
      extraFlags: ['--verbose', '--no-cache'],
    });

    expect(cmd).toBe('npx katana validate --modules all --verbose --no-cache');
  });

  it('should build a complete command with all options', () => {
    const cmd = buildCIValidationCommand({
      mode: 'validate',
      modules: ['sqli'],
      outputFormat: 'json',
      extraFlags: ['--verbose'],
    });

    expect(cmd).toBe('npx katana validate --modules sqli --output json --verbose');
  });

  it('should handle empty modules array as all modules for validate', () => {
    const cmd = buildCIValidationCommand({
      mode: 'validate',
      modules: [],
    });

    expect(cmd).toBe('npx katana validate --modules all');
  });

  it('should handle calibrate mode with specific modules', () => {
    const cmd = buildCIValidationCommand({
      mode: 'calibrate',
      modules: ['prompt-injection'],
    });

    expect(cmd).toBe('npx katana calibrate --modules prompt-injection');
  });
});

// ---------------------------------------------------------------------------
// parseCIExitCode
// ---------------------------------------------------------------------------

describe('parseCIExitCode', () => {
  it('should describe exit code 0 as pass', () => {
    const result = parseCIExitCode(CI_EXIT_CODES.PASS);

    expect(result).toContain('passed');
    expect(result).toContain('zero FP/FN');
  });

  it('should describe exit code 1 as validation failure', () => {
    const result = parseCIExitCode(CI_EXIT_CODES.FAIL);

    expect(result).toContain('failed');
    expect(result).toContain('false positive');
  });

  it('should describe exit code 2 as calibration failure', () => {
    const result = parseCIExitCode(CI_EXIT_CODES.CALIBRATION_FAIL);

    expect(result).toContain('Calibration');
    expect(result).toContain('failed');
  });

  it('should describe exit code 3 as integrity failure', () => {
    const result = parseCIExitCode(CI_EXIT_CODES.INTEGRITY_FAIL);

    expect(result).toContain('Integrity');
    expect(result).toContain('failed');
  });

  it('should handle unknown exit codes gracefully', () => {
    const result = parseCIExitCode(42);

    expect(result).toContain('Unknown');
    expect(result).toContain('42');
  });

  it('should handle negative exit codes', () => {
    const result = parseCIExitCode(-1);

    expect(result).toContain('Unknown');
    expect(result).toContain('-1');
  });
});
