/**
 * Tests for test utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getFixturesDir,
  getFixturePath,
  normalizeText,
  expectBlocked,
  createMockPattern,
  measureTime,
  benchmark,
  assertThrows,
  repeat,
  createStringOfLength,
  createZalgoText,
  isValidScanResult,
  isValidFinding,
} from './utils.js';

describe('getFixturesDir', () => {
  it('returns a path ending with fixtures', () => {
    expect(getFixturesDir()).toContain('fixtures');
  });
});

describe('getFixturePath', () => {
  it('joins parts to fixtures dir', () => {
    const path = getFixturePath('sub', 'file.txt');
    expect(path).toContain('fixtures');
    expect(path).toContain('file.txt');
  });
});

describe('normalizeText', () => {
  it('normalizes NFKC', () => {
    const result = normalizeText('\ufb01'); // fi ligature
    expect(result).toBe('fi');
  });
});

describe('expectBlocked', () => {
  it('returns true for paths without clean', () => {
    expect(expectBlocked('/data/attack-001.txt')).toBe(true);
  });

  it('returns false for clean paths', () => {
    expect(expectBlocked('/data/clean-001.txt')).toBe(false);
    expect(expectBlocked('/clean/test.txt')).toBe(false);
  });
});

describe('createMockPattern', () => {
  it('creates pattern with defaults', () => {
    const pattern = createMockPattern();
    expect(pattern.name).toBe('test-pattern');
    expect(pattern.sev).toBe('WARNING');
  });

  it('applies overrides', () => {
    const pattern = createMockPattern({ name: 'custom', sev: 'CRITICAL' });
    expect(pattern.name).toBe('custom');
    expect(pattern.sev).toBe('CRITICAL');
  });
});

describe('measureTime', () => {
  it('returns result and elapsed time', async () => {
    const { result, elapsed } = await measureTime(() => 42);
    expect(result).toBe(42);
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });
});

describe('assertThrows', () => {
  it('returns thrown error', async () => {
    const err = await assertThrows(() => { throw new Error('test'); });
    expect(err.message).toBe('test');
  });

  it('throws when function does not throw', async () => {
    await expect(assertThrows(() => 'no-throw')).rejects.toThrow('Expected function to throw');
  });
});

describe('string utilities', () => {
  it('repeat creates repeated strings', () => {
    expect(repeat('ab', 3)).toBe('ababab');
  });

  it('createStringOfLength creates exact length', () => {
    expect(createStringOfLength(10)).toHaveLength(10);
    expect(createStringOfLength(5, 'xy')).toHaveLength(5);
  });

  it('createZalgoText adds diacritics', () => {
    const zalgo = createZalgoText('hi', 1);
    expect(zalgo.length).toBeGreaterThan(2);
  });
});

describe('type guards', () => {
  it('isValidScanResult validates correct structure', () => {
    expect(isValidScanResult({
      elapsed: 1, textLength: 10, normalizedLength: 10,
      verdict: 'ALLOW', findings: [],
      counts: { critical: 0, warning: 0, info: 0 },
    })).toBe(true);
  });

  it('isValidScanResult rejects invalid structure', () => {
    expect(isValidScanResult(null)).toBe(false);
    expect(isValidScanResult({ verdict: 'MAYBE' })).toBe(false);
  });

  it('isValidFinding validates correct structure', () => {
    expect(isValidFinding({
      category: 'test', severity: 'INFO', description: 'd',
      match: 'm', source: 's', engine: 'e',
    })).toBe(true);
  });

  it('isValidFinding rejects invalid structure', () => {
    expect(isValidFinding(null)).toBe(false);
    expect(isValidFinding({ category: 'test' })).toBe(false);
  });
});
