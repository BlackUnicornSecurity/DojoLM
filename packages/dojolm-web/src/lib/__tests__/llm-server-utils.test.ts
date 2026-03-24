/**
 * File: llm-server-utils.test.ts
 * Purpose: Tests for server-side LLM utility functions
 * Index:
 *   - SRV-001: generateModelReport returns report with all required fields
 *   - SRV-002: generateModelReport calculates avgResilienceScore correctly
 *   - SRV-003: generateModelReport calculates injectionSuccessRate correctly
 *   - SRV-004: generateModelReport calculates harmfulnessRate correctly
 *   - SRV-005: generateModelReport builds category breakdown with passRate and avgScore
 *   - SRV-006: generateModelReport builds OWASP coverage from executions
 *   - SRV-007: generateModelReport builds TPI coverage from executions
 *   - SRV-008: generateModelReport calculates overallCoveragePercent
 *   - SRV-009: generateModelReport calculates duration stats
 *   - SRV-010: generateModelReport throws when model not found
 *   - SRV-011: generateModelReport handles empty executions
 *   - SRV-012: fetchCoverageMap returns owasp/tpi/custom structure
 *   - SRV-013: fetchCoverageMap filters by modelId
 *   - SRV-014: fetchCoverageMap calculates percentages correctly
 *   - SRV-015: fetchCoverageMap handles empty executions
 *   - SRV-016: fetchCoverageMap without modelId uses all executions
 *   - SRV-017: generateModelReport handles multiple categories per execution
 *   - SRV-018: generateModelReport rounds avgResilienceScore to integer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockQueryExecutions = vi.fn();
const mockGetModelConfig = vi.fn();

vi.mock('../storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue({
    queryExecutions: (...args: unknown[]) => mockQueryExecutions(...args),
    getModelConfig: (...args: unknown[]) => mockGetModelConfig(...args),
  }),
}));

import { generateModelReport, fetchCoverageMap } from '../llm-server-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExecution(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exec-1',
    testCaseId: 'tc-1',
    modelConfigId: 'model-1',
    status: 'completed',
    resilienceScore: 80,
    injectionSuccess: 0,
    harmfulness: 0.1,
    categoriesPassed: ['prompt-injection'],
    categoriesFailed: [],
    owaspCoverage: { 'LLM01': true },
    tpiCoverage: { 'TPI-001': true },
    duration_ms: 250,
    ...overrides,
  };
}

function makeModelConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'model-1',
    name: 'Test GPT',
    provider: 'openai',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('llm-server-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // generateModelReport
  // =========================================================================
  describe('generateModelReport', () => {
    it('SRV-001: returns report with all required fields', async () => {
      mockQueryExecutions.mockResolvedValue({ executions: [makeExecution()] });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      expect(report).toMatchObject({
        modelConfigId: 'model-1',
        modelName: 'Test GPT',
        provider: 'openai',
        testCount: 1,
      });
      expect(report).toHaveProperty('avgResilienceScore');
      expect(report).toHaveProperty('injectionSuccessRate');
      expect(report).toHaveProperty('harmfulnessRate');
      expect(report).toHaveProperty('byCategory');
      expect(report).toHaveProperty('owaspCoverage');
      expect(report).toHaveProperty('tpiCoverage');
      expect(report).toHaveProperty('overallCoveragePercent');
      expect(report).toHaveProperty('totalDuration_ms');
      expect(report).toHaveProperty('avgDuration_ms');
      expect(report).toHaveProperty('generatedAt');
      expect(typeof report.generatedAt).toBe('string');
    });

    it('SRV-002: calculates avgResilienceScore correctly', async () => {
      const executions = [
        makeExecution({ resilienceScore: 60 }),
        makeExecution({ id: 'exec-2', resilienceScore: 90 }),
        makeExecution({ id: 'exec-3', resilienceScore: 75 }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      // (60 + 90 + 75) / 3 = 75
      expect(report.avgResilienceScore).toBe(75);
    });

    it('SRV-003: calculates injectionSuccessRate correctly', async () => {
      const executions = [
        makeExecution({ injectionSuccess: 1 }),
        makeExecution({ id: 'exec-2', injectionSuccess: 0 }),
        makeExecution({ id: 'exec-3', injectionSuccess: 1 }),
        makeExecution({ id: 'exec-4', injectionSuccess: 0 }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      // (1 + 0 + 1 + 0) / 4 = 0.5
      expect(report.injectionSuccessRate).toBe(0.5);
    });

    it('SRV-004: calculates harmfulnessRate correctly', async () => {
      const executions = [
        makeExecution({ harmfulness: 0.2 }),
        makeExecution({ id: 'exec-2', harmfulness: 0.8 }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      // (0.2 + 0.8) / 2 = 0.5
      expect(report.harmfulnessRate).toBe(0.5);
    });

    it('SRV-005: builds category breakdown with passRate and avgScore', async () => {
      const executions = [
        makeExecution({
          resilienceScore: 80,
          categoriesPassed: ['prompt-injection'],
          categoriesFailed: ['data-leak'],
        }),
        makeExecution({
          id: 'exec-2',
          resilienceScore: 60,
          categoriesPassed: ['data-leak'],
          categoriesFailed: ['prompt-injection'],
        }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      const piCategory = report.byCategory.find(c => c.category === 'prompt-injection');
      expect(piCategory).toBeDefined();
      // prompt-injection: 1 pass, 1 fail => passRate = 0.5, avgScore from passed only = 80
      expect(piCategory!.passRate).toBe(0.5);
      expect(piCategory!.avgScore).toBe(80);
      expect(piCategory!.count).toBe(2);

      const dlCategory = report.byCategory.find(c => c.category === 'data-leak');
      expect(dlCategory).toBeDefined();
      // data-leak: 1 pass, 1 fail => passRate = 0.5, avgScore from passed only = 60
      expect(dlCategory!.passRate).toBe(0.5);
      expect(dlCategory!.avgScore).toBe(60);
      expect(dlCategory!.count).toBe(2);
    });

    it('SRV-006: builds OWASP coverage from executions', async () => {
      const executions = [
        makeExecution({ owaspCoverage: { 'LLM01': true, 'LLM02': false } }),
        makeExecution({ id: 'exec-2', owaspCoverage: { 'LLM01': true, 'LLM02': true } }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      const llm01 = report.owaspCoverage.find(c => c.category === 'LLM01');
      expect(llm01).toBeDefined();
      expect(llm01!.tested).toBe(2);
      expect(llm01!.passRate).toBe(1); // 2/2

      const llm02 = report.owaspCoverage.find(c => c.category === 'LLM02');
      expect(llm02).toBeDefined();
      expect(llm02!.tested).toBe(2);
      expect(llm02!.passRate).toBe(0.5); // 1/2
    });

    it('SRV-007: builds TPI coverage from executions', async () => {
      const executions = [
        makeExecution({ tpiCoverage: { 'TPI-001': true, 'TPI-002': false } }),
        makeExecution({ id: 'exec-2', tpiCoverage: { 'TPI-001': false, 'TPI-002': true } }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      const tpi001 = report.tpiCoverage.find(t => t.story === 'TPI-001');
      expect(tpi001).toBeDefined();
      expect(tpi001!.tested).toBe(2);
      expect(tpi001!.passRate).toBe(0.5); // 1/2

      const tpi002 = report.tpiCoverage.find(t => t.story === 'TPI-002');
      expect(tpi002).toBeDefined();
      expect(tpi002!.tested).toBe(2);
      expect(tpi002!.passRate).toBe(0.5); // 1/2
    });

    it('SRV-008: calculates overallCoveragePercent', async () => {
      // 2 OWASP categories (both with passRate > 0) + 1 TPI story (passRate > 0)
      // overallCategories size = 3, passing = 3, percent = 100
      const executions = [
        makeExecution({
          owaspCoverage: { 'LLM01': true, 'LLM02': true },
          tpiCoverage: { 'TPI-001': true },
        }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      expect(report.overallCoveragePercent).toBe(100);
    });

    it('SRV-009: calculates duration stats', async () => {
      const executions = [
        makeExecution({ duration_ms: 100 }),
        makeExecution({ id: 'exec-2', duration_ms: 300 }),
        makeExecution({ id: 'exec-3', duration_ms: 200 }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      expect(report.totalDuration_ms).toBe(600);
      expect(report.avgDuration_ms).toBe(200);
    });

    it('SRV-010: throws when model not found', async () => {
      mockQueryExecutions.mockResolvedValue({ executions: [] });
      mockGetModelConfig.mockResolvedValue(null);

      await expect(generateModelReport('nonexistent')).rejects.toThrow(
        'Model not found: nonexistent'
      );
    });

    it('SRV-011: handles empty executions', async () => {
      mockQueryExecutions.mockResolvedValue({ executions: [] });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      expect(report.testCount).toBe(0);
      expect(report.avgResilienceScore).toBe(0);
      expect(report.injectionSuccessRate).toBe(0);
      expect(report.harmfulnessRate).toBe(0);
      expect(report.byCategory).toEqual([]);
      expect(report.owaspCoverage).toEqual([]);
      expect(report.tpiCoverage).toEqual([]);
      expect(report.overallCoveragePercent).toBe(0);
      expect(report.totalDuration_ms).toBe(0);
      expect(report.avgDuration_ms).toBe(0);
    });

    it('SRV-017: handles multiple categories per execution', async () => {
      const executions = [
        makeExecution({
          resilienceScore: 90,
          categoriesPassed: ['prompt-injection', 'jailbreak'],
          categoriesFailed: ['data-leak'],
        }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      expect(report.byCategory).toHaveLength(3);

      const pi = report.byCategory.find(c => c.category === 'prompt-injection');
      expect(pi).toMatchObject({ passRate: 1, avgScore: 90, count: 1 });

      const jb = report.byCategory.find(c => c.category === 'jailbreak');
      expect(jb).toMatchObject({ passRate: 1, avgScore: 90, count: 1 });

      const dl = report.byCategory.find(c => c.category === 'data-leak');
      expect(dl).toMatchObject({ passRate: 0, avgScore: 0, count: 1 });
    });

    it('SRV-018: rounds avgResilienceScore to integer', async () => {
      const executions = [
        makeExecution({ resilienceScore: 33 }),
        makeExecution({ id: 'exec-2', resilienceScore: 33 }),
        makeExecution({ id: 'exec-3', resilienceScore: 34 }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      const report = await generateModelReport('model-1');

      // (33 + 33 + 34) / 3 = 33.333... => rounded to 33
      expect(report.avgResilienceScore).toBe(33);
      expect(Number.isInteger(report.avgResilienceScore)).toBe(true);
    });

    it('SRV-019: passes correct query params to fileStorage', async () => {
      mockQueryExecutions.mockResolvedValue({ executions: [] });
      mockGetModelConfig.mockResolvedValue(makeModelConfig());

      await generateModelReport('model-1');

      expect(mockQueryExecutions).toHaveBeenCalledWith({
        modelConfigId: 'model-1',
        limit: 10000,
      });
      expect(mockGetModelConfig).toHaveBeenCalledWith('model-1');
    });
  });

  // =========================================================================
  // fetchCoverageMap
  // =========================================================================
  describe('fetchCoverageMap', () => {
    it('SRV-012: returns owasp/tpi/custom structure', async () => {
      mockQueryExecutions.mockResolvedValue({ executions: [makeExecution()] });

      const map = await fetchCoverageMap();

      expect(map).toHaveProperty('owasp');
      expect(map).toHaveProperty('tpi');
      expect(map).toHaveProperty('custom');
    });

    it('SRV-013: filters by modelId', async () => {
      const executions = [
        makeExecution({
          modelConfigId: 'model-1',
          owaspCoverage: { 'LLM01': true },
          tpiCoverage: { 'TPI-001': true },
        }),
        makeExecution({
          id: 'exec-2',
          modelConfigId: 'model-2',
          owaspCoverage: { 'LLM02': true },
          tpiCoverage: { 'TPI-002': true },
        }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });

      const map = await fetchCoverageMap('model-1');

      expect(map.owasp).toHaveProperty('LLM01');
      expect(map.owasp).not.toHaveProperty('LLM02');
      expect(map.tpi).toHaveProperty('TPI-001');
      expect(map.tpi).not.toHaveProperty('TPI-002');
    });

    it('SRV-014: calculates percentages correctly', async () => {
      const executions = [
        makeExecution({
          owaspCoverage: { 'LLM01': true },
          tpiCoverage: { 'TPI-001': false },
        }),
        makeExecution({
          id: 'exec-2',
          owaspCoverage: { 'LLM01': false },
          tpiCoverage: { 'TPI-001': true },
        }),
        makeExecution({
          id: 'exec-3',
          owaspCoverage: { 'LLM01': true },
          tpiCoverage: { 'TPI-001': true },
        }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });

      const map = await fetchCoverageMap();

      // LLM01: 2 passed / 3 tested => 67% (rounded)
      expect(map.owasp['LLM01'].tested).toBe(3);
      expect(map.owasp['LLM01'].passed).toBe(2);
      expect(map.owasp['LLM01'].percentage).toBe(67);

      // TPI-001: 2 passed / 3 tested => 67% (rounded)
      expect(map.tpi['TPI-001'].tested).toBe(3);
      expect(map.tpi['TPI-001'].passed).toBe(2);
      expect(map.tpi['TPI-001'].percentage).toBe(67);
    });

    it('SRV-015: handles empty executions', async () => {
      mockQueryExecutions.mockResolvedValue({ executions: [] });

      const map = await fetchCoverageMap();

      expect(map.owasp).toEqual({});
      expect(map.tpi).toEqual({});
      expect(map.custom).toEqual({});
    });

    it('SRV-016: without modelId uses all executions', async () => {
      const executions = [
        makeExecution({
          modelConfigId: 'model-1',
          owaspCoverage: { 'LLM01': true },
          tpiCoverage: {},
        }),
        makeExecution({
          id: 'exec-2',
          modelConfigId: 'model-2',
          owaspCoverage: { 'LLM02': true },
          tpiCoverage: {},
        }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });

      const map = await fetchCoverageMap();

      expect(map.owasp).toHaveProperty('LLM01');
      expect(map.owasp).toHaveProperty('LLM02');
    });

    it('SRV-020: percentage is 0 when all tests fail', async () => {
      const executions = [
        makeExecution({ owaspCoverage: { 'LLM01': false }, tpiCoverage: { 'TPI-001': false } }),
        makeExecution({ id: 'exec-2', owaspCoverage: { 'LLM01': false }, tpiCoverage: { 'TPI-001': false } }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });

      const map = await fetchCoverageMap();

      expect(map.owasp['LLM01'].percentage).toBe(0);
      expect(map.owasp['LLM01'].tested).toBe(2);
      expect(map.owasp['LLM01'].passed).toBe(0);

      expect(map.tpi['TPI-001'].percentage).toBe(0);
    });

    it('SRV-021: percentage is 100 when all tests pass', async () => {
      const executions = [
        makeExecution({ owaspCoverage: { 'LLM01': true }, tpiCoverage: { 'TPI-001': true } }),
        makeExecution({ id: 'exec-2', owaspCoverage: { 'LLM01': true }, tpiCoverage: { 'TPI-001': true } }),
      ];
      mockQueryExecutions.mockResolvedValue({ executions });

      const map = await fetchCoverageMap();

      expect(map.owasp['LLM01'].percentage).toBe(100);
      expect(map.tpi['TPI-001'].percentage).toBe(100);
    });

    it('SRV-022: passes correct query params to fileStorage', async () => {
      mockQueryExecutions.mockResolvedValue({ executions: [] });

      await fetchCoverageMap('model-1');

      expect(mockQueryExecutions).toHaveBeenCalledWith({ limit: 10000 });
    });
  });
});
