/**
 * Test Utilities for BU-TPI Scanner
 *
 * Common helper functions for unit and integration tests.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Path Utilities
// ---------------------------------------------------------------------------

/**
 * Get the path to the fixtures directory
 */
export function getFixturesDir(): string {
  return join(process.cwd(), 'fixtures');
}

/**
 * Get the path to a specific fixture file
 */
export function getFixturePath(...parts: string[]): string {
  return join(getFixturesDir(), ...parts);
}

/**
 * Read a text fixture file
 */
export function readTextFixture(...parts: string[]): string {
  const path = getFixturePath(...parts);
  return readFileSync(path, 'utf-8');
}

/**
 * Read a binary fixture file
 */
export function readBinaryFixture(...parts: string[]): Buffer {
  const path = getFixturePath(...parts);
  return readFileSync(path);
}

// ---------------------------------------------------------------------------
// Scanner Test Utilities
// ---------------------------------------------------------------------------

/**
 * Normalize text for comparison (handles Unicode normalization)
 */
export function normalizeText(text: string): string {
  return text.normalize('NFKC');
}

/**
 * Check if text is expected to be blocked based on file path
 *
 * Uses heuristic: if "clean" is in the filename or parent directory, expect ALLOW
 */
export function expectBlocked(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return !lowerPath.includes('/clean-') &&
         !lowerPath.includes('\\clean-') &&
         !lowerPath.includes('/clean/') &&
         !lowerPath.includes('\\clean\\');
}

// ---------------------------------------------------------------------------
// Mock Creation Utilities
// ---------------------------------------------------------------------------

/**
 * Create a mock pattern for testing
 */
export function createMockPattern(overrides: {
  name?: string;
  cat?: string;
  sev?: 'INFO' | 'WARNING' | 'CRITICAL';
  desc?: string;
  re?: RegExp;
} = {}) {
  return {
    name: overrides.name || 'test-pattern',
    cat: overrides.cat || 'Test Category',
    sev: overrides.sev || 'WARNING',
    re: overrides.re || /test/i,
    desc: overrides.desc || 'Test pattern description',
  };
}

/**
 * Create a mock custom detector function
 */
export function createMockDetector(result: string | null = null) {
  return jest.fn(() => result);
}

// ---------------------------------------------------------------------------
// Performance Testing Utilities
// ---------------------------------------------------------------------------

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; elapsed: number }> {
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;
  return { result, elapsed };
}

/**
 * Run a function multiple times and return statistics
 */
export async function benchmark<T>(
  fn: () => T | Promise<T>,
  iterations: number = 100
): Promise<{
  min: number;
  max: number;
  avg: number;
  total: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { elapsed } = await measureTime(fn);
    times.push(elapsed);
  }

  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    total: times.reduce((a, b) => a + b, 0),
  };
}

// ---------------------------------------------------------------------------
// Error Testing Utilities
// ---------------------------------------------------------------------------

/**
 * Assert that a function throws an error
 */
export async function assertThrows(
  fn: () => unknown | Promise<unknown>,
  message?: string
): Promise<Error> {
  try {
    await fn();
    throw new Error(`Expected function to throw${message ? `: ${message}` : ''}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Expected function to throw')) {
      throw error;
    }
    return error as Error;
  }
}

/**
 * Assert that an async function completes within a timeout
 */
export async function assertTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  message?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(
      `Function did not complete within ${timeoutMs}ms${message ? `: ${message}` : ''}`
    )), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

// ---------------------------------------------------------------------------
// String Manipulation for Testing
// ---------------------------------------------------------------------------

/**
 * Repeat a string to create long inputs
 */
export function repeat(str: string, count: number): string {
  return Array(count + 1).join(str);
}

/**
 * Create a string of a specific length
 */
export function createStringOfLength(length: number, char: string = 'a'): string {
  return repeat(char, Math.ceil(length / char.length)).substring(0, length);
}

/**
 * Create zalgo text for testing
 */
export function createZalgoText(base: string, intensity: number = 1): string {
  const diacritics = [
    '\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307',
    '\u0308', '\u0309', '\u030A', '\u030B', '\u030C', '\u030D', '\u030E', '\u030F',
    '\u0310', '\u0311', '\u0312', '\u0313', '\u0314', '\u0315', '\u0316', '\u0317',
  ];

  let result = '';
  for (const char of base) {
    result += char;
    for (let i = 0; i < intensity; i++) {
      for (let j = 0; j < 3; j++) {
        result += diacritics[Math.floor(Math.random() * diacritics.length)];
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

/**
 * Check if a value is a valid ScanResult
 */
export function isValidScanResult(value: unknown): value is import('../types.js').ScanResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;

  return (
    typeof result.elapsed === 'number' &&
    typeof result.textLength === 'number' &&
    typeof result.normalizedLength === 'number' &&
    typeof result.verdict === 'string' &&
    (result.verdict === 'ALLOW' || result.verdict === 'BLOCK') &&
    Array.isArray(result.findings) &&
    typeof result.counts === 'object' &&
    result.counts !== null &&
    typeof result.counts.critical === 'number' &&
    typeof result.counts.warning === 'number' &&
    typeof result.counts.info === 'number'
  );
}

/**
 * Check if a value is a valid Finding
 */
export function isValidFinding(value: unknown): value is import('../types.js').Finding {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const finding = value as Record<string, unknown>;

  return (
    typeof finding.category === 'string' &&
    typeof finding.severity === 'string' &&
    (finding.severity === 'INFO' || finding.severity === 'WARNING' || finding.severity === 'CRITICAL') &&
    typeof finding.description === 'string' &&
    typeof finding.match === 'string' &&
    typeof finding.source === 'string' &&
    typeof finding.engine === 'string'
  );
}
