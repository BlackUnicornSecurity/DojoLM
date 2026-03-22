/**
 * KATANA Boundary Input Testing Tests (K7.1)
 *
 * ISO 17025 Clause: 7.2.2 — Boundary Input Validation
 */

import { describe, it, expect, vi } from 'vitest';
import {
  BOUNDARY_TEST_CASES,
  runBoundaryTest,
  runAllBoundaryTests,
  formatBoundaryReport,
  type BoundaryTestCase,
  type BoundaryTestResult,
  type ScanFunction,
  type ScanResult,
} from '../runner/boundary-testing.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSafeScanFn(): ScanFunction {
  return (_text: string): ScanResult => ({
    findings: [],
    verdict: 'clean',
  });
}

function makeFindingScanFn(): ScanFunction {
  return (_text: string): ScanResult => ({
    findings: [{ severity: 'WARNING' }],
    verdict: 'malicious',
  });
}

function makeCrashingScanFn(): ScanFunction {
  return (_text: string): ScanResult => {
    throw new Error('Scanner crashed on input');
  };
}

function makeResult(overrides: Partial<BoundaryTestResult> = {}): BoundaryTestResult {
  return {
    test_case_id: 'test-001',
    passed: true,
    elapsed_ms: 5,
    findings_count: 0,
    memory_before_mb: 50,
    memory_after_mb: 52,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Case Input Generation
// ---------------------------------------------------------------------------

describe('K7.1 — Boundary Input Testing', () => {
  describe('BOUNDARY_TEST_CASES', () => {
    it('should contain all 12 required test cases', () => {
      expect(BOUNDARY_TEST_CASES).toHaveLength(12);

      const ids = BOUNDARY_TEST_CASES.map(tc => tc.id);
      expect(ids).toContain('empty_string');
      expect(ids).toContain('single_char');
      expect(ids).toContain('max_length');
      expect(ids).toContain('null_bytes');
      expect(ids).toContain('binary_in_text');
      expect(ids).toContain('pure_whitespace');
      expect(ids).toContain('pure_zero_width');
      expect(ids).toContain('extreme_repetition');
      expect(ids).toContain('emoji_only');
      expect(ids).toContain('cjk_only');
      expect(ids).toContain('pure_newlines');
      expect(ids).toContain('mixed_unicode_categories');
    });

    it('should have unique IDs for all test cases', () => {
      const ids = BOUNDARY_TEST_CASES.map(tc => tc.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have positive timeout_ms for all test cases', () => {
      for (const tc of BOUNDARY_TEST_CASES) {
        expect(tc.timeout_ms).toBeGreaterThan(0);
      }
    });

    it('should have non-empty name and description for all test cases', () => {
      for (const tc of BOUNDARY_TEST_CASES) {
        expect(tc.name.length).toBeGreaterThan(0);
        expect(tc.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Input generators', () => {
    it('empty_string generates empty input', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'empty_string')!;
      expect(tc.generateInput()).toBe('');
    });

    it('single_char generates single character', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'single_char')!;
      const input = tc.generateInput();
      expect(input).toBe('a');
      expect(input.length).toBe(1);
    });

    it('max_length generates 1MB input', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'max_length')!;
      const input = tc.generateInput();
      expect(input.length).toBe(1_048_576);
    });

    it('null_bytes generates 1000 null characters', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'null_bytes')!;
      const input = tc.generateInput();
      expect(input.length).toBe(1_000);
      expect(input[0]).toBe('\0');
    });

    it('binary_in_text generates decodable string from bytes', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'binary_in_text')!;
      const input = tc.generateInput();
      expect(typeof input).toBe('string');
      expect(input.length).toBeGreaterThan(0);
    });

    it('pure_whitespace generates 10000 spaces', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'pure_whitespace')!;
      const input = tc.generateInput();
      expect(input.length).toBe(10_000);
      expect(input.trim()).toBe('');
    });

    it('pure_zero_width generates 1000 zero-width chars', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'pure_zero_width')!;
      const input = tc.generateInput();
      expect(input.length).toBe(1_000);
      expect(input[0]).toBe('\u200B');
    });

    it('extreme_repetition generates repeated text', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'extreme_repetition')!;
      const input = tc.generateInput();
      expect(input).toContain('IGNORE PREVIOUS');
      // 10000 repetitions joined by spaces
      const count = input.split('IGNORE PREVIOUS').length - 1;
      expect(count).toBe(10_000);
    });

    it('emoji_only generates 1000 emoji characters', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'emoji_only')!;
      const input = tc.generateInput();
      // Emoji are multi-byte, so string length may vary, but we join 1000 emojis
      expect(input.length).toBeGreaterThan(0);
      // Should contain known emoji
      expect(input).toContain('\u{1F600}');
    });

    it('cjk_only generates 1000 CJK characters', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'cjk_only')!;
      const input = tc.generateInput();
      expect(input.length).toBe(1_000);
      // First CJK char should be U+4E00
      expect(input.charCodeAt(0)).toBe(0x4E00);
    });

    it('pure_newlines generates 10000 newlines', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'pure_newlines')!;
      const input = tc.generateInput();
      expect(input.length).toBe(10_000);
      expect(input[0]).toBe('\n');
    });

    it('mixed_unicode_categories generates multi-script text', () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'mixed_unicode_categories')!;
      const input = tc.generateInput();
      expect(input).toContain('Hello World'); // Latin
      expect(input).toContain('\u4F60\u597D'); // CJK
      expect(input).toContain('\u0645\u0631'); // Arabic
    });

    it('all generators produce deterministic output', () => {
      for (const tc of BOUNDARY_TEST_CASES) {
        const output1 = tc.generateInput();
        const output2 = tc.generateInput();
        expect(output1).toBe(output2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // runBoundaryTest
  // ---------------------------------------------------------------------------

  describe('runBoundaryTest', () => {
    it('should return correct result shape', async () => {
      const tc = BOUNDARY_TEST_CASES[0];
      const result = await runBoundaryTest(tc, makeSafeScanFn());

      expect(result).toHaveProperty('test_case_id');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('elapsed_ms');
      expect(result).toHaveProperty('findings_count');
      expect(result).toHaveProperty('memory_before_mb');
      expect(result).toHaveProperty('memory_after_mb');
      expect(typeof result.test_case_id).toBe('string');
      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.elapsed_ms).toBe('number');
      expect(typeof result.findings_count).toBe('number');
      expect(typeof result.memory_before_mb).toBe('number');
      expect(typeof result.memory_after_mb).toBe('number');
    });

    it('should pass for empty input with safe scanner', async () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'empty_string')!;
      const result = await runBoundaryTest(tc, makeSafeScanFn());

      expect(result.test_case_id).toBe('empty_string');
      expect(result.passed).toBe(true);
      expect(result.findings_count).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should pass for single char input with safe scanner', async () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'single_char')!;
      const result = await runBoundaryTest(tc, makeSafeScanFn());

      expect(result.passed).toBe(true);
      expect(result.test_case_id).toBe('single_char');
    });

    it('should pass for max length input with safe scanner', async () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'max_length')!;
      const result = await runBoundaryTest(tc, makeSafeScanFn());

      expect(result.passed).toBe(true);
      expect(result.elapsed_ms).toBeGreaterThanOrEqual(0);
      expect(result.elapsed_ms).toBeLessThan(tc.timeout_ms);
    });

    it('should capture error when scanner crashes', async () => {
      const tc = BOUNDARY_TEST_CASES.find(t => t.id === 'null_bytes')!;
      const result = await runBoundaryTest(tc, makeCrashingScanFn());

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Scanner crashed');
      expect(result.findings_count).toBe(0);
    });

    it('should track memory before and after', async () => {
      const tc = BOUNDARY_TEST_CASES[0];
      const result = await runBoundaryTest(tc, makeSafeScanFn());

      expect(result.memory_before_mb).toBeGreaterThanOrEqual(0);
      expect(result.memory_after_mb).toBeGreaterThanOrEqual(0);
    });

    it('should record elapsed time', async () => {
      const tc = BOUNDARY_TEST_CASES[0];
      const result = await runBoundaryTest(tc, makeSafeScanFn());

      expect(result.elapsed_ms).toBeGreaterThanOrEqual(0);
    });

    it('should pass for "finding" expected behavior when findings exist', async () => {
      const tc: BoundaryTestCase = {
        id: 'test_finding',
        name: 'Test Finding',
        description: 'Expects findings',
        generateInput: () => 'malicious content',
        expected_behavior: 'finding',
        timeout_ms: 5_000,
      };

      const result = await runBoundaryTest(tc, makeFindingScanFn());

      expect(result.passed).toBe(true);
      expect(result.findings_count).toBe(1);
    });

    it('should fail for "finding" expected behavior when no findings', async () => {
      const tc: BoundaryTestCase = {
        id: 'test_no_finding',
        name: 'Test No Finding',
        description: 'Expects findings but gets none',
        generateInput: () => 'clean content',
        expected_behavior: 'finding',
        timeout_ms: 5_000,
      };

      const result = await runBoundaryTest(tc, makeSafeScanFn());

      expect(result.passed).toBe(false);
    });

    it('should pass for "no_finding" expected behavior when no findings', async () => {
      const tc: BoundaryTestCase = {
        id: 'test_expect_clean',
        name: 'Test Expect Clean',
        description: 'Expects no findings',
        generateInput: () => 'clean content',
        expected_behavior: 'no_finding',
        timeout_ms: 5_000,
      };

      const result = await runBoundaryTest(tc, makeSafeScanFn());

      expect(result.passed).toBe(true);
    });

    it('should handle all boundary test cases without crashing', async () => {
      const scanFn = makeSafeScanFn();
      for (const tc of BOUNDARY_TEST_CASES) {
        const result = await runBoundaryTest(tc, scanFn);
        expect(result.test_case_id).toBe(tc.id);
        expect(result.passed).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // runAllBoundaryTests
  // ---------------------------------------------------------------------------

  describe('runAllBoundaryTests', () => {
    it('should run all test cases and return results array', async () => {
      const results = await runAllBoundaryTests(makeSafeScanFn());

      expect(results).toHaveLength(BOUNDARY_TEST_CASES.length);
      expect(results).toHaveLength(12);
    });

    it('should return results in same order as test cases', async () => {
      const results = await runAllBoundaryTests(makeSafeScanFn());

      for (let i = 0; i < results.length; i++) {
        expect(results[i].test_case_id).toBe(BOUNDARY_TEST_CASES[i].id);
      }
    });

    it('should call scan function for each test case', async () => {
      const scanFn = vi.fn(makeSafeScanFn());
      await runAllBoundaryTests(scanFn);

      expect(scanFn).toHaveBeenCalledTimes(BOUNDARY_TEST_CASES.length);
    });

    it('should return readonly array', async () => {
      const results = await runAllBoundaryTests(makeSafeScanFn());

      // TypeScript readonly check — the array should still be iterable
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // formatBoundaryReport
  // ---------------------------------------------------------------------------

  describe('formatBoundaryReport', () => {
    it('should produce valid markdown', () => {
      const results: readonly BoundaryTestResult[] = [
        makeResult({ test_case_id: 'empty_string', passed: true }),
        makeResult({ test_case_id: 'single_char', passed: true }),
      ];

      const report = formatBoundaryReport(results);

      expect(report).toContain('# KATANA Boundary Input Test Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Results');
      expect(report).toContain('## Failed Tests');
    });

    it('should include schema version and ISO reference', () => {
      const report = formatBoundaryReport([makeResult()]);

      expect(report).toContain('Schema Version');
      expect(report).toContain('ISO 17025');
      expect(report).toContain('7.2.2');
    });

    it('should report correct pass/fail counts', () => {
      const results: readonly BoundaryTestResult[] = [
        makeResult({ test_case_id: 'tc1', passed: true }),
        makeResult({ test_case_id: 'tc2', passed: true }),
        makeResult({ test_case_id: 'tc3', passed: false, error: 'crash' }),
      ];

      const report = formatBoundaryReport(results);

      expect(report).toContain('| Total Tests | 3 |');
      expect(report).toContain('| Passed | 2 |');
      expect(report).toContain('| Failed | 1 |');
      expect(report).toContain('**FAIL**');
    });

    it('should show PASS verdict when all tests pass', () => {
      const results: readonly BoundaryTestResult[] = [
        makeResult({ test_case_id: 'tc1', passed: true }),
        makeResult({ test_case_id: 'tc2', passed: true }),
      ];

      const report = formatBoundaryReport(results);

      expect(report).toContain('**PASS**');
    });

    it('should include failed test details', () => {
      const results: readonly BoundaryTestResult[] = [
        makeResult({
          test_case_id: 'empty_string',
          passed: false,
          error: 'Unexpected crash',
          elapsed_ms: 150,
        }),
      ];

      const report = formatBoundaryReport(results);

      expect(report).toContain('empty_string');
      expect(report).toContain('Unexpected crash');
    });

    it('should indicate no failures when all pass', () => {
      const results: readonly BoundaryTestResult[] = [
        makeResult({ test_case_id: 'tc1', passed: true }),
      ];

      const report = formatBoundaryReport(results);

      expect(report).toContain('No failures detected');
    });

    it('should handle empty results array', () => {
      const report = formatBoundaryReport([]);

      expect(report).toContain('# KATANA Boundary Input Test Report');
      expect(report).toContain('| Total Tests | 0 |');
      expect(report).toContain('**PASS**');
    });

    it('should include memory and timing columns in table', () => {
      const results: readonly BoundaryTestResult[] = [
        makeResult({
          test_case_id: 'empty_string',
          elapsed_ms: 42,
          memory_before_mb: 50.12,
          memory_after_mb: 51.34,
        }),
      ];

      const report = formatBoundaryReport(results);

      expect(report).toContain('Mem Before');
      expect(report).toContain('Mem After');
      expect(report).toContain('42');
      expect(report).toContain('50.12');
      expect(report).toContain('51.34');
    });
  });
});
