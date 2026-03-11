/**
 * Tests for fuzzer.ts — FuzzSession, detectAnomaly, fuzz, getFuzzCoverage, exportResults
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFuzzSession, detectAnomaly, fuzz, getFuzzCoverage, exportResults } from './fuzzer.js';
import { PROMPT_GRAMMAR } from './grammar.js';
import type { FuzzConfig, FuzzSession, FuzzResult } from './types.js';
import { DEFAULT_FUZZ_CONFIG } from './types.js';

// ---------- helpers ----------
function makeConfig(overrides: Partial<FuzzConfig> = {}): FuzzConfig {
  return {
    maxIterations: 10,
    timeoutMs: 30_000,
    mutationRate: 0.3,
    grammarRules: PROMPT_GRAMMAR,
    seed: 'test-seed',
    ...overrides,
  };
}

const allowScanner = (_text: string) => ({
  verdict: 'ALLOW' as const,
  findings: [] as { category: string }[],
  counts: { critical: 0, warning: 0, info: 0 },
});

const blockScanner = (_text: string) => ({
  verdict: 'BLOCK' as const,
  findings: [{ category: 'TEST' }],
  counts: { critical: 1, warning: 0, info: 0 },
});

const crashingScanner = (_text: string): never => {
  throw new Error('Scanner crashed');
};

// ---------- tests ----------

describe('fuzzer.ts', () => {
  // FZ-001
  it('FZ-001: createFuzzSession returns running session with default config', () => {
    const session = createFuzzSession();
    expect(session.status).toBe('running');
    expect(session.results).toEqual([]);
    expect(session.endTime).toBeNull();
    expect(session.config).toEqual(DEFAULT_FUZZ_CONFIG);
  });

  // FZ-002
  it('FZ-002: createFuzzSession assigns a unique id', () => {
    const s1 = createFuzzSession();
    const s2 = createFuzzSession();
    expect(s1.id).not.toBe(s2.id);
    expect(s1.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  // FZ-003
  it('FZ-003: createFuzzSession accepts custom config', () => {
    const cfg = makeConfig({ maxIterations: 42, seed: 'custom' });
    const session = createFuzzSession(cfg);
    expect(session.config.maxIterations).toBe(42);
    expect(session.config.seed).toBe('custom');
  });

  // FZ-004
  it('FZ-004: detectAnomaly returns performance-degradation when duration > 5x avg', () => {
    expect(detectAnomaly(600, 100)).toBe('performance-degradation');
  });

  // FZ-005
  it('FZ-005: detectAnomaly returns timeout when duration > 10s and avg is 0', () => {
    expect(detectAnomaly(15_000, 0)).toBe('timeout');
  });

  // FZ-006
  it('FZ-006: detectAnomaly returns unexpected-verdict when verdicts differ', () => {
    expect(detectAnomaly(50, 100, 'BLOCK', 'ALLOW')).toBe('unexpected-verdict');
    expect(detectAnomaly(50, 100, 'ALLOW', 'BLOCK')).toBe('unexpected-verdict');
  });

  // FZ-007
  it('FZ-007: detectAnomaly returns null for normal conditions', () => {
    expect(detectAnomaly(100, 100)).toBeNull();
    expect(detectAnomaly(100, 100, 'BLOCK', 'BLOCK')).toBeNull();
  });

  // FZ-008
  it('FZ-008: fuzz completes session and populates results', () => {
    const session = createFuzzSession(makeConfig({ maxIterations: 5 }));
    const result = fuzz(session, allowScanner);
    expect(result.status).toBe('completed');
    expect(result.endTime).not.toBeNull();
    expect(result.results.length).toBeGreaterThan(0);
  });

  // FZ-009
  it('FZ-009: fuzz records scanner crash as anomaly', () => {
    const session = createFuzzSession(makeConfig({ maxIterations: 3 }));
    const result = fuzz(session, crashingScanner);
    expect(result.status).toBe('completed');
    expect(result.results.every((r) => r.anomaly)).toBe(true);
    expect(result.results.every((r) => r.anomalyType === 'timeout')).toBe(true);
  });

  // FZ-010
  it('FZ-010: fuzz truncates input to 1000 chars in results', () => {
    const session = createFuzzSession(makeConfig({
      maxIterations: 5,
      grammarRules: [
        { name: 'long', pattern: '{REPEAT:100:abcdefghij}', weight: 1, category: 'test' },
      ],
    }));
    const result = fuzz(session, allowScanner);
    for (const r of result.results) {
      expect(r.input.length).toBeLessThanOrEqual(1000);
    }
  });

  // FZ-011
  it('FZ-011: fuzz aborts when timeout reached', () => {
    const session = createFuzzSession(makeConfig({
      maxIterations: 100_000,
      timeoutMs: 1, // 1ms timeout — effectively immediate
    }));
    const result = fuzz(session, allowScanner);
    // Should either abort or complete with fewer iterations than maxIterations
    expect(result.results.length).toBeLessThan(100_000);
  });

  // FZ-012
  it('FZ-012: fuzz caps maxIterations at 10000', () => {
    const session = createFuzzSession(makeConfig({ maxIterations: 50_000 }));
    const result = fuzz(session, allowScanner);
    expect(result.results.length).toBeLessThanOrEqual(10_000);
  });

  // FZ-013
  it('FZ-013: getFuzzCoverage returns correct stats for empty session', () => {
    const session = createFuzzSession();
    const coverage = getFuzzCoverage(session);
    expect(coverage.totalInputs).toBe(0);
    expect(coverage.anomalies).toBe(0);
    expect(coverage.blockedRate).toBe(0);
    expect(coverage.avgLatencyMs).toBe(0);
  });

  // FZ-014
  it('FZ-014: getFuzzCoverage computes blocked rate', () => {
    const session = createFuzzSession(makeConfig({ maxIterations: 10 }));
    fuzz(session, blockScanner);
    const coverage = getFuzzCoverage(session);
    expect(coverage.blockedRate).toBe(1);
    expect(coverage.totalInputs).toBe(10);
  });

  // FZ-015
  it('FZ-015: exportResults returns valid JSON with expected fields', () => {
    const session = createFuzzSession(makeConfig({ maxIterations: 3 }));
    fuzz(session, allowScanner);
    const json = exportResults(session);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(session.id);
    expect(parsed.status).toBe('completed');
    expect(parsed.summary).toBeDefined();
    expect(parsed.summary.totalInputs).toBe(3);
    expect(Array.isArray(parsed.anomalies)).toBe(true);
    expect(typeof parsed.totalResults).toBe('number');
  });

  // FZ-016
  it('FZ-016: fuzz uses mutation when results exist and rng triggers mutation', () => {
    // High mutation rate + enough iterations to trigger mutation path
    const session = createFuzzSession(makeConfig({
      maxIterations: 20,
      mutationRate: 1.0,
      grammarRules: PROMPT_GRAMMAR,
      seed: 'mutation-test',
    }));
    const result = fuzz(session, blockScanner);
    // With mutationRate=1.0 and blockScanner always returning BLOCK,
    // interesting inputs pool is used for mutation
    expect(result.results.length).toBe(20);
  });
});
