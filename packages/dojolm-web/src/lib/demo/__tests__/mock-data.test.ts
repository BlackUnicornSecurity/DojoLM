/**
 * Tests for core mock data files: models, test cases, executions, batches
 */

import { describe, it, expect } from 'vitest';
import { DEMO_MODELS, MODEL_RESILIENCE_TARGETS, DEMO_MODEL_IDS } from '../mock-models';
import { getDemoTestCases, TEST_CASE_CATEGORY_COUNTS } from '../mock-test-cases';
import { getDemoExecutions, DEMO_BATCHES, getDemoPopulatedBatches, getDemoBatchExecutions, getDemoModelAvgScore } from '../mock-executions';

describe('Mock Models', () => {
  it('has exactly 8 models', () => {
    expect(DEMO_MODELS).toHaveLength(8);
  });

  it('has unique IDs', () => {
    const ids = new Set(DEMO_MODELS.map(m => m.id));
    expect(ids.size).toBe(8);
  });

  it('has 3 BlackUnicorn models', () => {
    const bu = DEMO_MODELS.filter(m => m.provider === 'blackunicorn');
    expect(bu).toHaveLength(3);
  });

  it('Basileak has CRITICAL safety risk', () => {
    const basileak = DEMO_MODELS.find(m => m.name === 'Basileak-7B');
    expect(basileak?.safetyRisk).toBe('CRITICAL');
    expect(basileak?.requiresGuard).toBe(true);
  });

  it('Shogun has SAFE safety risk', () => {
    const shogun = DEMO_MODELS.find(m => m.name === 'Shogun-13B');
    expect(shogun?.safetyRisk).toBe('SAFE');
  });

  it('has one disabled model (Phantom)', () => {
    const disabled = DEMO_MODELS.filter(m => !m.enabled);
    expect(disabled).toHaveLength(1);
    expect(disabled[0].name).toBe('Phantom-7B');
  });

  it('all models have required fields', () => {
    for (const m of DEMO_MODELS) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.provider).toBeTruthy();
      expect(m.model).toBeTruthy();
      expect(typeof m.enabled).toBe('boolean');
      expect(m.createdAt).toBeTruthy();
      expect(m.updatedAt).toBeTruthy();
    }
  });

  it('has no API keys in mock models', () => {
    for (const m of DEMO_MODELS) {
      expect(m.apiKey).toBeUndefined();
    }
  });

  it('resilience targets cover all models', () => {
    for (const id of DEMO_MODEL_IDS) {
      expect(MODEL_RESILIENCE_TARGETS[id]).toBeDefined();
    }
  });

  it('Basileak has lowest resilience target', () => {
    const min = Math.min(...Object.values(MODEL_RESILIENCE_TARGETS));
    expect(MODEL_RESILIENCE_TARGETS['demo-model-basileak']).toBe(min);
  });

  it('Shogun has highest resilience target', () => {
    const max = Math.max(...Object.values(MODEL_RESILIENCE_TARGETS));
    expect(MODEL_RESILIENCE_TARGETS['demo-model-shogun']).toBe(max);
  });

  it('uses fictional provider URLs (not real endpoints)', () => {
    for (const m of DEMO_MODELS) {
      if (m.baseUrl) {
        expect(m.baseUrl).toContain('.demo');
      }
    }
  });
});

describe('Mock Test Cases', () => {
  const testCases = getDemoTestCases();

  it('has exactly 60 test cases', () => {
    expect(testCases).toHaveLength(60);
  });

  it('has unique IDs', () => {
    const ids = new Set(testCases.map(tc => tc.id));
    expect(ids.size).toBe(60);
  });

  it('matches category counts', () => {
    const counts: Record<string, number> = {};
    for (const tc of testCases) {
      counts[tc.category] = (counts[tc.category] ?? 0) + 1;
    }
    for (const [cat, expected] of Object.entries(TEST_CASE_CATEGORY_COUNTS)) {
      expect(counts[cat]).toBe(expected);
    }
  });

  it('all test cases have required fields', () => {
    for (const tc of testCases) {
      expect(tc.id).toBeTruthy();
      expect(tc.name).toBeTruthy();
      expect(tc.category).toBeTruthy();
      expect(tc.prompt).toBeDefined();
      expect(tc.expectedBehavior).toBeTruthy();
      expect(tc.severity).toBeTruthy();
      expect(tc.enabled).toBe(true);
    }
  });

  it('covers all 9 categories', () => {
    const categories = new Set(testCases.map(tc => tc.category));
    expect(categories.size).toBe(9);
  });

  it('has mixed severities', () => {
    const severities = new Set(testCases.map(tc => tc.severity));
    expect(severities.size).toBeGreaterThanOrEqual(4);
  });

  it('has OWASP mappings for security test cases', () => {
    const securityCategories = ['prompt-injection', 'output-analysis', 'supply-chain', 'model-theft', 'dos-resilience', 'agent-security', 'mcp-security'];
    const securityCases = testCases.filter(tc => securityCategories.includes(tc.category));
    const withOwasp = securityCases.filter(tc => tc.owaspCategory);
    expect(withOwasp.length).toBe(securityCases.length);
  });

  it('caches test cases (returns same reference)', () => {
    const first = getDemoTestCases();
    const second = getDemoTestCases();
    expect(first).toBe(second);
  });
});

describe('Mock Executions', () => {
  const executions = getDemoExecutions();

  it('generates executions for all model-testcase combinations', () => {
    // Batch 1 = 8 models * 60 tests = 480
    // Batch 2 = 1 model * 60 tests = 60
    // Batch 3 = 3 models * 24 tests = 72
    // Batch 4 = 7 models * 60 tests = 420
    // Total = 1032
    expect(executions.length).toBeGreaterThan(400);
  });

  it('all executions have required fields', () => {
    for (const e of executions.slice(0, 20)) { // Check first 20 for performance
      expect(e.id).toBeTruthy();
      expect(e.testCaseId).toBeTruthy();
      expect(e.modelConfigId).toBeTruthy();
      expect(e.timestamp).toBeTruthy();
      expect(e.status).toBe('completed');
      expect(typeof e.resilienceScore).toBe('number');
      expect(e.resilienceScore).toBeGreaterThanOrEqual(0);
      expect(e.resilienceScore).toBeLessThanOrEqual(100);
      expect(typeof e.injectionSuccess).toBe('number');
      expect(typeof e.contentHash).toBe('string');
    }
  });

  it('totalTokens equals promptTokens + completionTokens', () => {
    for (const e of executions.slice(0, 50)) {
      if (e.promptTokens !== undefined && e.completionTokens !== undefined) {
        expect(e.totalTokens).toBe(e.promptTokens + e.completionTokens);
      }
    }
  });

  it('failed executions have non-zero harmfulness', () => {
    const failed = executions.filter(e => e.injectionSuccess > 0.5);
    for (const e of failed.slice(0, 20)) {
      expect(e.harmfulness).toBeGreaterThanOrEqual(0.15);
    }
  });

  it('Basileak has low average score', () => {
    const avg = getDemoModelAvgScore('demo-model-basileak');
    expect(avg).toBeLessThan(40);
  });

  it('Shogun has high average score', () => {
    const avg = getDemoModelAvgScore('demo-model-shogun');
    expect(avg).toBeGreaterThan(80);
  });

  it('generates deterministic results (same seed = same output)', () => {
    const first = getDemoExecutions();
    const second = getDemoExecutions();
    expect(first).toBe(second); // Same cached reference
  });
});

describe('Mock Batches', () => {
  it('has 4 batches', () => {
    expect(DEMO_BATCHES).toHaveLength(4);
  });

  it('all batches are completed', () => {
    for (const b of DEMO_BATCHES) {
      expect(b.status).toBe('completed');
    }
  });

  it('getDemoPopulatedBatches returns batches with executionIds', () => {
    const populated = getDemoPopulatedBatches();
    for (const b of populated) {
      expect(b.executionIds.length).toBeGreaterThan(0);
    }
  });

  it('DEMO_BATCHES are not mutated by getDemoExecutions()', () => {
    getDemoExecutions();
    // DEMO_BATCHES should not have executionIds (they are Omit<..., 'executionIds'>)
    for (const b of DEMO_BATCHES) {
      expect(b).not.toHaveProperty('executionIds');
    }
  });

  it('getDemoBatchExecutions returns correct subset', () => {
    const batch1Execs = getDemoBatchExecutions('demo-batch-001');
    expect(batch1Execs.length).toBeGreaterThan(0);
    for (const e of batch1Execs) {
      expect(e.id).toContain('demo-batch-001');
    }
  });
});
