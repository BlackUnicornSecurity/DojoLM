/**
 * EdgeFuzz Generator Tests
 * Tests for edge-case input generators and types.
 */

import { describe, it, expect } from 'vitest';
import {
  EDGE_CASE_TYPES,
  generateLengthCases,
  generateEncodingCases,
  generateStructuralCases,
  generateLanguageCases,
  generateNumericCases,
  generateAllCases,
} from './index.js';
import type { EdgeCaseResult } from './index.js';

// ---------------------------------------------------------------------------
// Helper: assert standard EdgeCaseResult shape
// ---------------------------------------------------------------------------

function assertValidResult(result: EdgeCaseResult): void {
  expect(EDGE_CASE_TYPES).toContain(result.type);
  expect(typeof result.subType).toBe('string');
  expect(result.subType.length).toBeGreaterThan(0);
  expect(typeof result.content).toBe('string');
  expect(typeof result.description).toBe('string');
  expect(result.description.length).toBeGreaterThan(0);
  expect(['crash', 'truncate', 'error', 'handle']).toContain(
    result.expectedBehavior,
  );
}

// ---------------------------------------------------------------------------
// EDGE_CASE_TYPES
// ---------------------------------------------------------------------------

describe('EDGE_CASE_TYPES', () => {
  it('is an array of valid types', () => {
    expect(Array.isArray(EDGE_CASE_TYPES)).toBe(true);
    expect(EDGE_CASE_TYPES).toContain('length');
    expect(EDGE_CASE_TYPES).toContain('encoding');
    expect(EDGE_CASE_TYPES).toContain('structural');
    expect(EDGE_CASE_TYPES).toContain('language');
    expect(EDGE_CASE_TYPES).toContain('numeric');
    expect(EDGE_CASE_TYPES).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// generateLengthCases
// ---------------------------------------------------------------------------

describe('generateLengthCases', () => {
  it('returns EdgeCaseResult[] with type, subType, and content', () => {
    const results = generateLengthCases();
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      assertValidResult(r);
      expect(r.type).toBe('length');
    }
  });

  it('has no duplicate subTypes', () => {
    const results = generateLengthCases();
    const subTypes = results.map((r) => r.subType);
    expect(new Set(subTypes).size).toBe(subTypes.length);
  });
});

// ---------------------------------------------------------------------------
// generateEncodingCases
// ---------------------------------------------------------------------------

describe('generateEncodingCases', () => {
  it('returns results with encoding payloads', () => {
    const results = generateEncodingCases();
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      assertValidResult(r);
      expect(r.type).toBe('encoding');
      // All encoding cases have non-empty content
      expect(r.content.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate subTypes', () => {
    const results = generateEncodingCases();
    const subTypes = results.map((r) => r.subType);
    expect(new Set(subTypes).size).toBe(subTypes.length);
  });
});

// ---------------------------------------------------------------------------
// generateStructuralCases
// ---------------------------------------------------------------------------

describe('generateStructuralCases', () => {
  it('returns structural test cases', () => {
    const results = generateStructuralCases();
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      assertValidResult(r);
      expect(r.type).toBe('structural');
      expect(r.content.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate subTypes', () => {
    const results = generateStructuralCases();
    const subTypes = results.map((r) => r.subType);
    expect(new Set(subTypes).size).toBe(subTypes.length);
  });
});

// ---------------------------------------------------------------------------
// generateLanguageCases
// ---------------------------------------------------------------------------

describe('generateLanguageCases', () => {
  it('returns multi-language/script cases', () => {
    const results = generateLanguageCases();
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      assertValidResult(r);
      expect(r.type).toBe('language');
      expect(r.content.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate subTypes', () => {
    const results = generateLanguageCases();
    const subTypes = results.map((r) => r.subType);
    expect(new Set(subTypes).size).toBe(subTypes.length);
  });
});

// ---------------------------------------------------------------------------
// generateNumericCases
// ---------------------------------------------------------------------------

describe('generateNumericCases', () => {
  it('returns numeric boundary cases', () => {
    const results = generateNumericCases();
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      assertValidResult(r);
      expect(r.type).toBe('numeric');
      expect(r.content.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate subTypes', () => {
    const results = generateNumericCases();
    const subTypes = results.map((r) => r.subType);
    expect(new Set(subTypes).size).toBe(subTypes.length);
  });
});

// ---------------------------------------------------------------------------
// generateAllCases
// ---------------------------------------------------------------------------

describe('generateAllCases', () => {
  it('returns combined results from all generators', () => {
    const all = generateAllCases();
    const length = generateLengthCases().length;
    const encoding = generateEncodingCases().length;
    const structural = generateStructuralCases().length;
    const language = generateLanguageCases().length;
    const numeric = generateNumericCases().length;

    expect(all).toHaveLength(length + encoding + structural + language + numeric);
    expect(all.length).toBeGreaterThanOrEqual(25);
  });

  it('all results have non-empty content (except empty-string edge case)', () => {
    const all = generateAllCases();
    for (const r of all) {
      assertValidResult(r);
      // The empty-string length case is the sole exception
      if (r.subType !== 'empty') {
        expect(r.content.length).toBeGreaterThan(0);
      }
    }
  });

  it('covers all five edge case types', () => {
    const all = generateAllCases();
    const typesPresent = new Set(all.map((r) => r.type));
    for (const t of EDGE_CASE_TYPES) {
      expect(typesPresent.has(t)).toBe(true);
    }
  });
});
