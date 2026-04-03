/**
 * GUNKIMONO Phase 6.2: Expanded Benchmark Suites Tests
 */

import { describe, it, expect } from 'vitest';
import { DOJOLM_BENCH_V1, CATEGORY_DIFFICULTY } from './dojolm-bench.js';
import { AGENTIC_BENCHMARK_SUITE, AGENTIC_CATEGORY_DIFFICULTY } from './agentic-bench.js';
import { RAG_BENCHMARK_SUITE, RAG_CATEGORY_DIFFICULTY } from './rag-bench.js';
import { HARMBENCH_SUITE, HARMBENCH_CATEGORY_DIFFICULTY } from './harmbench.js';
import { STRONGREJECT_SUITE, STRONGREJECT_CATEGORY_DIFFICULTY } from './strongreject.js';

// ---------------------------------------------------------------------------
// Agentic Benchmark Suite
// ---------------------------------------------------------------------------

describe('Agentic Benchmark Suite (expanded)', () => {
  it('has correct metadata', () => {
    expect(AGENTIC_BENCHMARK_SUITE.id).toBe('agentic-bench-v1');
    expect(AGENTIC_BENCHMARK_SUITE.scoringMethod).toBe('weighted_category');
    expect(AGENTIC_BENCHMARK_SUITE.version).toBe('1.0.0');
  });

  it('has 8 categories', () => {
    expect(AGENTIC_BENCHMARK_SUITE.categories).toHaveLength(8);
  });

  it('has 200 fixtures total', () => {
    expect(AGENTIC_BENCHMARK_SUITE.fixtureCount).toBe(200);
  });

  it('fixture count matches category sum', () => {
    const sum = AGENTIC_BENCHMARK_SUITE.categories.reduce((s, c) => s + c.fixtureIds.length, 0);
    expect(AGENTIC_BENCHMARK_SUITE.fixtureCount).toBe(sum);
  });

  it('includes benign category for false-positive testing', () => {
    const benign = AGENTIC_BENCHMARK_SUITE.categories.find((c) => c.name === 'benign-tool-use');
    expect(benign).toBeDefined();
    expect(Object.values(benign!.expectedVerdicts).every((v) => v === 'ALLOW')).toBe(true);
  });

  it('all attack categories expect BLOCK verdicts (except clean controls)', () => {
    const attackCategories = AGENTIC_BENCHMARK_SUITE.categories.filter(
      (c) => c.name !== 'benign-tool-use',
    );
    for (const cat of attackCategories) {
      const blockCount = Object.values(cat.expectedVerdicts).filter((v) => v === 'BLOCK').length;
      const allowCount = Object.values(cat.expectedVerdicts).filter((v) => v === 'ALLOW').length;
      // ~10% clean controls
      expect(blockCount).toBeGreaterThan(allowCount);
    }
  });

  it('category weights sum to 1.0', () => {
    const totalWeight = AGENTIC_BENCHMARK_SUITE.categories.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('each fixture ID is unique', () => {
    const allIds = AGENTIC_BENCHMARK_SUITE.categories.flatMap((c) => c.fixtureIds);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('each fixture has an expected verdict', () => {
    for (const cat of AGENTIC_BENCHMARK_SUITE.categories) {
      for (const id of cat.fixtureIds) {
        expect(cat.expectedVerdicts[id]).toBeDefined();
      }
    }
  });

  it('has difficulty mappings for all categories', () => {
    for (const cat of AGENTIC_BENCHMARK_SUITE.categories) {
      expect(AGENTIC_CATEGORY_DIFFICULTY[cat.name]).toBeDefined();
    }
  });

  it('includes new categories: schema-poisoning, multi-agent-exploit, capability-escalation', () => {
    const names = AGENTIC_BENCHMARK_SUITE.categories.map((c) => c.name);
    expect(names).toContain('schema-poisoning');
    expect(names).toContain('multi-agent-exploit');
    expect(names).toContain('capability-escalation');
  });
});

// ---------------------------------------------------------------------------
// RAG Benchmark Suite
// ---------------------------------------------------------------------------

describe('RAG Benchmark Suite (expanded)', () => {
  it('has correct metadata', () => {
    expect(RAG_BENCHMARK_SUITE.id).toBe('rag-bench-v1');
    expect(RAG_BENCHMARK_SUITE.scoringMethod).toBe('weighted_category');
    expect(RAG_BENCHMARK_SUITE.version).toBe('1.0.0');
  });

  it('has 7 categories', () => {
    expect(RAG_BENCHMARK_SUITE.categories).toHaveLength(7);
  });

  it('has 150 fixtures total', () => {
    expect(RAG_BENCHMARK_SUITE.fixtureCount).toBe(150);
  });

  it('fixture count matches category sum', () => {
    const sum = RAG_BENCHMARK_SUITE.categories.reduce((s, c) => s + c.fixtureIds.length, 0);
    expect(RAG_BENCHMARK_SUITE.fixtureCount).toBe(sum);
  });

  it('includes clean category for false-positive testing', () => {
    const clean = RAG_BENCHMARK_SUITE.categories.find((c) => c.name === 'clean-rag');
    expect(clean).toBeDefined();
    expect(Object.values(clean!.expectedVerdicts).every((v) => v === 'ALLOW')).toBe(true);
  });

  it('all attack categories expect BLOCK verdicts (except clean controls)', () => {
    const attackCategories = RAG_BENCHMARK_SUITE.categories.filter(
      (c) => c.name !== 'clean-rag',
    );
    for (const cat of attackCategories) {
      const blockCount = Object.values(cat.expectedVerdicts).filter((v) => v === 'BLOCK').length;
      const allowCount = Object.values(cat.expectedVerdicts).filter((v) => v === 'ALLOW').length;
      expect(blockCount).toBeGreaterThan(allowCount);
    }
  });

  it('category weights sum to 1.0', () => {
    const totalWeight = RAG_BENCHMARK_SUITE.categories.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('each fixture ID is unique', () => {
    const allIds = RAG_BENCHMARK_SUITE.categories.flatMap((c) => c.fixtureIds);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('each fixture has an expected verdict', () => {
    for (const cat of RAG_BENCHMARK_SUITE.categories) {
      for (const id of cat.fixtureIds) {
        expect(cat.expectedVerdicts[id]).toBeDefined();
      }
    }
  });

  it('has difficulty mappings for all categories', () => {
    for (const cat of RAG_BENCHMARK_SUITE.categories) {
      expect(RAG_CATEGORY_DIFFICULTY[cat.name]).toBeDefined();
    }
  });

  it('includes new categories: context-poisoning, citation-spoofing, retrieval-manipulation', () => {
    const names = RAG_BENCHMARK_SUITE.categories.map((c) => c.name);
    expect(names).toContain('context-poisoning');
    expect(names).toContain('citation-spoofing');
    expect(names).toContain('retrieval-manipulation');
  });
});

// ---------------------------------------------------------------------------
// HarmBench Suite
// ---------------------------------------------------------------------------

describe('HarmBench Suite', () => {
  it('has correct metadata', () => {
    expect(HARMBENCH_SUITE.id).toBe('harmbench-v1');
    expect(HARMBENCH_SUITE.scoringMethod).toBe('weighted_category');
    expect(HARMBENCH_SUITE.version).toBe('1.0.0');
  });

  it('has 7 categories', () => {
    expect(HARMBENCH_SUITE.categories).toHaveLength(7);
  });

  it('has 140 fixtures total', () => {
    expect(HARMBENCH_SUITE.fixtureCount).toBe(140);
  });

  it('fixture count matches category sum', () => {
    const sum = HARMBENCH_SUITE.categories.reduce((s, c) => s + c.fixtureIds.length, 0);
    expect(HARMBENCH_SUITE.fixtureCount).toBe(sum);
  });

  it('all categories expect BLOCK verdicts (harmful content)', () => {
    for (const cat of HARMBENCH_SUITE.categories) {
      const allBlock = Object.values(cat.expectedVerdicts).every((v) => v === 'BLOCK');
      expect(allBlock).toBe(true);
    }
  });

  it('category weights sum to 1.0', () => {
    const totalWeight = HARMBENCH_SUITE.categories.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('each fixture ID is unique', () => {
    const allIds = HARMBENCH_SUITE.categories.flatMap((c) => c.fixtureIds);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('each fixture has an expected verdict', () => {
    for (const cat of HARMBENCH_SUITE.categories) {
      for (const id of cat.fixtureIds) {
        expect(cat.expectedVerdicts[id]).toBeDefined();
      }
    }
  });

  it('has difficulty mappings for all categories', () => {
    for (const cat of HARMBENCH_SUITE.categories) {
      expect(HARMBENCH_CATEGORY_DIFFICULTY[cat.name]).toBeDefined();
    }
  });

  it('includes all 7 HarmBench taxonomy categories', () => {
    const names = HARMBENCH_SUITE.categories.map((c) => c.name);
    expect(names).toContain('chemical-biological');
    expect(names).toContain('cybercrime');
    expect(names).toContain('disinformation');
    expect(names).toContain('harassment');
    expect(names).toContain('illegal-activities');
    expect(names).toContain('malware');
    expect(names).toContain('self-harm');
  });
});

// ---------------------------------------------------------------------------
// StrongReject Suite
// ---------------------------------------------------------------------------

describe('StrongReject Suite', () => {
  it('has correct metadata', () => {
    expect(STRONGREJECT_SUITE.id).toBe('strongreject-v1');
    expect(STRONGREJECT_SUITE.scoringMethod).toBe('weighted_category');
    expect(STRONGREJECT_SUITE.version).toBe('1.0.0');
  });

  it('has 5 categories', () => {
    expect(STRONGREJECT_SUITE.categories).toHaveLength(5);
  });

  it('has 100 fixtures total', () => {
    expect(STRONGREJECT_SUITE.fixtureCount).toBe(100);
  });

  it('fixture count matches category sum', () => {
    const sum = STRONGREJECT_SUITE.categories.reduce((s, c) => s + c.fixtureIds.length, 0);
    expect(STRONGREJECT_SUITE.fixtureCount).toBe(sum);
  });

  it('false-positive-benign category expects all ALLOW verdicts', () => {
    const benign = STRONGREJECT_SUITE.categories.find((c) => c.name === 'false-positive-benign');
    expect(benign).toBeDefined();
    expect(Object.values(benign!.expectedVerdicts).every((v) => v === 'ALLOW')).toBe(true);
  });

  it('harmful categories expect mostly BLOCK verdicts', () => {
    const harmfulCategories = STRONGREJECT_SUITE.categories.filter(
      (c) => c.name !== 'false-positive-benign',
    );
    for (const cat of harmfulCategories) {
      const blockCount = Object.values(cat.expectedVerdicts).filter((v) => v === 'BLOCK').length;
      expect(blockCount).toBeGreaterThan(0);
    }
  });

  it('category weights sum to 1.0', () => {
    const totalWeight = STRONGREJECT_SUITE.categories.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('each fixture ID is unique', () => {
    const allIds = STRONGREJECT_SUITE.categories.flatMap((c) => c.fixtureIds);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('each fixture has an expected verdict', () => {
    for (const cat of STRONGREJECT_SUITE.categories) {
      for (const id of cat.fixtureIds) {
        expect(cat.expectedVerdicts[id]).toBeDefined();
      }
    }
  });

  it('has difficulty mappings for all categories', () => {
    for (const cat of STRONGREJECT_SUITE.categories) {
      expect(STRONGREJECT_CATEGORY_DIFFICULTY[cat.name]).toBeDefined();
    }
  });

  it('includes all 5 StrongReject categories', () => {
    const names = STRONGREJECT_SUITE.categories.map((c) => c.name);
    expect(names).toContain('direct-harmful');
    expect(names).toContain('subtle-harmful');
    expect(names).toContain('edge-case');
    expect(names).toContain('refusal-quality');
    expect(names).toContain('false-positive-benign');
  });
});
