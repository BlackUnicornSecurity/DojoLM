/**
 * Tests for test fixtures utilities
 */

import { describe, it, expect } from 'vitest';
import {
  CLEAN_TEXT_FIXTURES,
  MALICIOUS_TEXT_FIXTURES,
  createFinding,
  createScanResult,
  createBlockedResult,
  createJPEGBuffer,
  createPNGBuffer,
  createMP3Buffer,
  assertVerdict,
  assertCategory,
  assertNoCategory,
  assertCounts,
} from './fixtures.js';

describe('CLEAN_TEXT_FIXTURES', () => {
  it('has multiple fixture types', () => {
    expect(CLEAN_TEXT_FIXTURES.simple).toBeTruthy();
    expect(CLEAN_TEXT_FIXTURES.business).toBeTruthy();
    expect(CLEAN_TEXT_FIXTURES.code).toBeTruthy();
    expect(CLEAN_TEXT_FIXTURES.markdown).toBeTruthy();
    expect(CLEAN_TEXT_FIXTURES.json).toBeTruthy();
  });
});

describe('MALICIOUS_TEXT_FIXTURES', () => {
  it('has prompt injection fixtures', () => {
    expect(MALICIOUS_TEXT_FIXTURES.promptInjection).toContain('Ignore');
    expect(MALICIOUS_TEXT_FIXTURES.jailbreak).toContain('developer mode');
  });
});

describe('createFinding', () => {
  it('creates a finding with defaults', () => {
    const finding = createFinding();
    expect(finding.category).toBe('Test Category');
    expect(finding.severity).toBe('WARNING');
    expect(finding.engine).toBe('test-engine');
  });

  it('applies overrides', () => {
    const finding = createFinding({ category: 'Custom', severity: 'CRITICAL' });
    expect(finding.category).toBe('Custom');
    expect(finding.severity).toBe('CRITICAL');
  });
});

describe('createScanResult', () => {
  it('creates an ALLOW result by default', () => {
    const result = createScanResult();
    expect(result.verdict).toBe('ALLOW');
    expect(result.findings).toHaveLength(0);
  });

  it('applies overrides', () => {
    const result = createScanResult({ verdict: 'BLOCK', textLength: 500 });
    expect(result.verdict).toBe('BLOCK');
    expect(result.textLength).toBe(500);
  });
});

describe('createBlockedResult', () => {
  it('creates a BLOCK result with critical finding', () => {
    const result = createBlockedResult();
    expect(result.verdict).toBe('BLOCK');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('CRITICAL');
    expect(result.counts.critical).toBe(1);
  });
});

describe('binary buffer creators', () => {
  it('createJPEGBuffer creates buffer with JPEG markers', () => {
    const buf = createJPEGBuffer('test exif data');
    expect(buf[0]).toBe(0xFF);
    expect(buf[1]).toBe(0xD8); // SOI
  });

  it('createPNGBuffer creates buffer with PNG signature', () => {
    const buf = createPNGBuffer('keyword', 'text value');
    expect(buf[0]).toBe(0x89);
    expect(buf.toString('ascii', 1, 4)).toBe('PNG');
  });

  it('createMP3Buffer creates buffer with ID3 header', () => {
    const buf = createMP3Buffer('Test Title', 'Test Artist');
    expect(buf.toString('ascii', 0, 3)).toBe('ID3');
  });
});

describe('assertion helpers', () => {
  it('assertVerdict passes for correct verdict', () => {
    expect(() => assertVerdict(createScanResult(), 'ALLOW')).not.toThrow();
  });

  it('assertVerdict throws for incorrect verdict', () => {
    expect(() => assertVerdict(createScanResult(), 'BLOCK')).toThrow('Expected verdict BLOCK');
  });

  it('assertCategory passes when category exists', () => {
    const result = createScanResult({ findings: [createFinding({ category: 'PI' })] });
    expect(() => assertCategory(result, 'PI')).not.toThrow();
  });

  it('assertNoCategory passes when category absent', () => {
    expect(() => assertNoCategory(createScanResult(), 'PI')).not.toThrow();
  });

  it('assertCounts passes for correct counts', () => {
    const result = createScanResult({ counts: { critical: 1, warning: 2, info: 0 } });
    expect(() => assertCounts(result, { critical: 1, warning: 2 })).not.toThrow();
  });
});
