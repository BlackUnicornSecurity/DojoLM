import { describe, it, expect } from 'vitest';
import {
  generateLengthCases,
  generateEncodingCases,
  generateStructuralCases,
  generateLanguageCases,
  generateNumericCases,
  generateAllCases,
  EDGE_CASE_TYPES,
} from './generators.js';

describe('generateLengthCases', () => {
  it('returns cases including empty and large strings', () => {
    const cases = generateLengthCases();
    expect(cases.length).toBeGreaterThanOrEqual(4);
    const empty = cases.find((c) => c.subType === 'empty');
    expect(empty).toBeDefined();
    expect(empty!.content).toBe('');
    const large = cases.find((c) => c.subType === '1m');
    expect(large).toBeDefined();
    expect(large!.content.length).toBe(1_000_000);
  });

  it('all cases have type "length"', () => {
    for (const c of generateLengthCases()) {
      expect(c.type).toBe('length');
    }
  });
});

describe('generateEncodingCases', () => {
  it('includes multi-base64, zalgo, and null-bytes cases', () => {
    const cases = generateEncodingCases();
    const subTypes = cases.map((c) => c.subType);
    expect(subTypes).toContain('multi-base64');
    expect(subTypes).toContain('zalgo');
    expect(subTypes).toContain('null-bytes');
  });

  it('all cases have type "encoding"', () => {
    for (const c of generateEncodingCases()) {
      expect(c.type).toBe('encoding');
    }
  });
});

describe('generateStructuralCases', () => {
  it('includes deep-json and xml-bomb', () => {
    const cases = generateStructuralCases();
    const subTypes = cases.map((c) => c.subType);
    expect(subTypes).toContain('deep-json');
    expect(subTypes).toContain('xml-bomb');
  });

  it('deep-json contains nested structure', () => {
    const deepJson = generateStructuralCases().find((c) => c.subType === 'deep-json')!;
    expect(deepJson.content).toContain('level_0');
    expect(deepJson.content).toContain('leaf');
  });
});

describe('generateLanguageCases', () => {
  it('includes RTL, homoglyphs, and zero-width cases', () => {
    const cases = generateLanguageCases();
    const subTypes = cases.map((c) => c.subType);
    expect(subTypes).toContain('rtl-ltr-mixed');
    expect(subTypes).toContain('homoglyphs');
    expect(subTypes).toContain('zero-width');
  });
});

describe('generateNumericCases', () => {
  it('includes MAX_SAFE_INTEGER and NaN', () => {
    const cases = generateNumericCases();
    const subTypes = cases.map((c) => c.subType);
    expect(subTypes).toContain('max-safe-integer');
    expect(subTypes).toContain('nan');
    expect(subTypes).toContain('infinity');
  });

  it('all cases have type "numeric"', () => {
    for (const c of generateNumericCases()) {
      expect(c.type).toBe('numeric');
    }
  });
});

describe('generateAllCases', () => {
  it('returns at least 25 cases total', () => {
    const all = generateAllCases();
    expect(all.length).toBeGreaterThanOrEqual(25);
  });

  it('includes cases from all edge case types', () => {
    const all = generateAllCases();
    const types = new Set(all.map((c) => c.type));
    for (const t of EDGE_CASE_TYPES) {
      expect(types.has(t)).toBe(true);
    }
  });

  it('all contents respect the 10 MB size guard', () => {
    const MAX = 10 * 1024 * 1024;
    for (const c of generateAllCases()) {
      expect(c.content.length).toBeLessThanOrEqual(MAX);
    }
  });
});
