/**
 * KATANA Boundary Input Testing (K7.1)
 *
 * Tests scanner behavior at extreme input boundaries.
 * Each test case verifies the scanner does not crash, hang, or
 * produce incorrect results when given adversarial or edge-case inputs.
 *
 * ISO 17025 Clause: 7.2.2
 */

import { VALIDATION_CONFIG } from '../config.js';
import { SCHEMA_VERSION } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExpectedBehavior = 'no_crash' | 'timeout' | 'finding' | 'no_finding';

export interface BoundaryTestCase {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly generateInput: () => string;
  readonly expected_behavior: ExpectedBehavior;
  readonly timeout_ms: number;
}

export interface BoundaryTestResult {
  readonly test_case_id: string;
  readonly passed: boolean;
  readonly elapsed_ms: number;
  readonly error?: string;
  readonly findings_count: number;
  readonly memory_before_mb: number;
  readonly memory_after_mb: number;
}

export interface ScanResult {
  readonly findings: ReadonlyArray<{ readonly severity: string }>;
  readonly verdict: string;
}

export type ScanFunction = (text: string) => ScanResult;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LENGTH = 1_048_576; // 1 MB
const DEFAULT_TIMEOUT_MS = VALIDATION_CONFIG.SAMPLE_TIMEOUT_MS; // 30s

// ---------------------------------------------------------------------------
// Test Case Definitions
// ---------------------------------------------------------------------------

export const BOUNDARY_TEST_CASES: readonly BoundaryTestCase[] = [
  {
    id: 'empty_string',
    name: 'Empty String',
    description: 'Empty input — scanner must not crash on zero-length text',
    generateInput: () => '',
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'single_char',
    name: 'Single Character',
    description: 'Minimal non-empty input — single ASCII character',
    generateInput: () => 'a',
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'max_length',
    name: 'Maximum Length (1 MB)',
    description: '1 MB of repeated ASCII — tests memory and performance limits',
    generateInput: () => 'a'.repeat(MAX_LENGTH),
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'null_bytes',
    name: 'Null Bytes',
    description: '1000 null characters — tests binary safety in text mode',
    generateInput: () => '\0'.repeat(1_000),
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'binary_in_text',
    name: 'Binary in Text Mode',
    description: '512 random bytes interpreted as UTF-8 — tests encoding resilience',
    generateInput: () => {
      const bytes = new Uint8Array(512);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = (i * 37 + 13) % 256; // Deterministic pseudo-random
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    },
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'pure_whitespace',
    name: 'Pure Whitespace',
    description: '10000 space characters — tests whitespace-only handling',
    generateInput: () => ' '.repeat(10_000),
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'pure_zero_width',
    name: 'Pure Zero-Width Characters',
    description: '1000 zero-width spaces — tests invisible character handling',
    generateInput: () => '\u200B'.repeat(1_000),
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'extreme_repetition',
    name: 'Extreme Repetition',
    description: '"IGNORE PREVIOUS" repeated 10000 times — tests pattern matching performance',
    generateInput: () =>
      Array.from({ length: 10_000 }, () => 'IGNORE PREVIOUS').join(' '),
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'emoji_only',
    name: 'Emoji Only',
    description: '1000 emoji characters — tests multi-byte Unicode handling',
    generateInput: () => {
      const emojis = [
        '\u{1F600}', '\u{1F4A9}', '\u{1F525}', '\u{2764}', '\u{1F680}',
        '\u{1F31F}', '\u{1F4AF}', '\u{1F60D}', '\u{1F4A5}', '\u{1F308}',
      ];
      return Array.from(
        { length: 1_000 },
        (_, i) => emojis[i % emojis.length],
      ).join('');
    },
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'cjk_only',
    name: 'CJK Only',
    description: '1000 CJK characters — tests CJK Unicode range handling',
    generateInput: () => {
      const cjkStart = 0x4E00;
      return Array.from(
        { length: 1_000 },
        (_, i) => String.fromCodePoint(cjkStart + (i % 100)),
      ).join('');
    },
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'pure_newlines',
    name: 'Pure Newlines',
    description: '10000 newline characters — tests line-splitting edge case',
    generateInput: () => '\n'.repeat(10_000),
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
  {
    id: 'mixed_unicode_categories',
    name: 'Mixed Unicode Categories',
    description: 'Mix of Latin, CJK, Arabic, Emoji, and Math symbols',
    generateInput: () => {
      const segments = [
        'Hello World',                                     // Latin
        '\u4F60\u597D\u4E16\u754C',                       // CJK (Chinese)
        '\u0645\u0631\u062D\u0628\u0627',                 // Arabic
        '\u{1F600}\u{1F680}\u{1F4AF}',                    // Emoji
        '\u2200\u2203\u2205\u2208\u2229\u222A',           // Math
        '\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35',          // Thai
        '\u3053\u3093\u306B\u3061\u306F',                 // Japanese Hiragana
      ];
      return Array.from(
        { length: 100 },
        (_, i) => segments[i % segments.length],
      ).join(' ');
    },
    expected_behavior: 'no_crash',
    timeout_ms: DEFAULT_TIMEOUT_MS,
  },
] as const;

// ---------------------------------------------------------------------------
// Memory Tracking
// ---------------------------------------------------------------------------

function getMemoryMb(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Single Test Runner
// ---------------------------------------------------------------------------

/**
 * Run a single boundary test case against a scan function.
 * Enforces timeout and tracks memory usage.
 */
export async function runBoundaryTest(
  testCase: BoundaryTestCase,
  scanFn: ScanFunction,
): Promise<BoundaryTestResult> {
  const memoryBefore = getMemoryMb();
  const startTime = Date.now();

  try {
    const input = testCase.generateInput();

    const resultPromise = new Promise<ScanResult>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout after ${testCase.timeout_ms}ms`)),
        testCase.timeout_ms,
      );

      try {
        const result = scanFn(input);
        clearTimeout(timer);
        resolve(result);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });

    const scanResult = await resultPromise;
    const elapsed = Date.now() - startTime;
    const memoryAfter = getMemoryMb();
    const findingsCount = scanResult.findings.length;

    // Determine pass/fail based on expected behavior
    const passed = evaluateExpectedBehavior(
      testCase.expected_behavior,
      findingsCount,
      elapsed,
      testCase.timeout_ms,
    );

    return {
      test_case_id: testCase.id,
      passed,
      elapsed_ms: elapsed,
      findings_count: findingsCount,
      memory_before_mb: Math.round(memoryBefore * 100) / 100,
      memory_after_mb: Math.round(memoryAfter * 100) / 100,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const memoryAfter = getMemoryMb();
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Timeout is expected for 'timeout' behavior
    const passed = testCase.expected_behavior === 'timeout' &&
      errorMessage.includes('Timeout');

    return {
      test_case_id: testCase.id,
      passed,
      elapsed_ms: elapsed,
      error: errorMessage,
      findings_count: 0,
      memory_before_mb: Math.round(memoryBefore * 100) / 100,
      memory_after_mb: Math.round(memoryAfter * 100) / 100,
    };
  }
}

// ---------------------------------------------------------------------------
// Expected Behavior Evaluation
// ---------------------------------------------------------------------------

function evaluateExpectedBehavior(
  expected: ExpectedBehavior,
  findingsCount: number,
  elapsedMs: number,
  timeoutMs: number,
): boolean {
  switch (expected) {
    case 'no_crash':
      // Passed if we got here without throwing and within timeout
      return elapsedMs < timeoutMs;
    case 'timeout':
      // Expected to time out — if it completes, that's still acceptable
      return true;
    case 'finding':
      return findingsCount > 0;
    case 'no_finding':
      return findingsCount === 0;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// All Tests Runner
// ---------------------------------------------------------------------------

/**
 * Run all boundary test cases against a scan function.
 * Returns an immutable array of results.
 */
export async function runAllBoundaryTests(
  scanFn: ScanFunction,
): Promise<readonly BoundaryTestResult[]> {
  let results: readonly BoundaryTestResult[] = [];

  for (const testCase of BOUNDARY_TEST_CASES) {
    const result = await runBoundaryTest(testCase, scanFn);
    results = [...results, result];
  }

  return results;
}

// ---------------------------------------------------------------------------
// Report Formatter
// ---------------------------------------------------------------------------

/**
 * Format boundary test results as a Markdown report.
 */
export function formatBoundaryReport(
  results: readonly BoundaryTestResult[],
): string {
  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.length - totalPassed;
  const overallVerdict = totalFailed === 0 ? 'PASS' : 'FAIL';

  const testCaseMap = new Map(
    BOUNDARY_TEST_CASES.map(tc => [tc.id, tc]),
  );

  const lines: readonly string[] = [
    `# KATANA Boundary Input Test Report`,
    ``,
    `**Schema Version:** ${SCHEMA_VERSION}`,
    `**ISO 17025 Clause:** 7.2.2`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Memory Limit Multiplier:** ${VALIDATION_CONFIG.BOUNDARY_MEMORY_MULTIPLIER}x`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Tests | ${results.length} |`,
    `| Passed | ${totalPassed} |`,
    `| Failed | ${totalFailed} |`,
    `| Overall Verdict | **${overallVerdict}** |`,
    ``,
    `## Results`,
    ``,
    `| ID | Name | Passed | Time (ms) | Findings | Mem Before (MB) | Mem After (MB) | Error |`,
    `|----|------|--------|-----------|----------|-----------------|----------------|-------|`,
    ...results.map(r => {
      const tc = testCaseMap.get(r.test_case_id);
      const name = tc?.name ?? r.test_case_id;
      const passIcon = r.passed ? 'Yes' : 'No';
      const errorCol = r.error ? r.error.slice(0, 50) : '-';
      return `| ${r.test_case_id} | ${name} | ${passIcon} | ${r.elapsed_ms} | ${r.findings_count} | ${r.memory_before_mb} | ${r.memory_after_mb} | ${errorCol} |`;
    }),
    ``,
    `## Failed Tests`,
    ``,
    ...(() => {
      const failed = results.filter(r => !r.passed);
      if (failed.length === 0) {
        return ['No failures detected.', ''];
      }
      return failed.flatMap(r => {
        const tc = testCaseMap.get(r.test_case_id);
        return [
          `### ${tc?.name ?? r.test_case_id}`,
          ``,
          `- **ID:** ${r.test_case_id}`,
          `- **Expected:** ${tc?.expected_behavior ?? 'unknown'}`,
          `- **Error:** ${r.error ?? 'N/A'}`,
          `- **Elapsed:** ${r.elapsed_ms}ms`,
          ``,
        ];
      });
    })(),
  ];

  return lines.join('\n');
}
