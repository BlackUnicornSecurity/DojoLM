import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock database — matches pattern from base-repository.test.ts
// ---------------------------------------------------------------------------

const mockRun = vi.fn().mockReturnValue({ changes: 1 });
const mockGet = vi.fn();
const mockAll = vi.fn().mockReturnValue([]);
const mockPrepare = vi.fn().mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
const mockTransaction = vi.fn((fn: any) => fn);

vi.mock('../db/database', () => ({
  getDatabase: vi.fn(() => ({
    prepare: mockPrepare,
    transaction: mockTransaction,
  })),
}));

// Mock node:crypto for content hash tests
vi.mock('node:crypto', () => ({
  default: {
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('abc123hash'),
    })),
    randomUUID: vi.fn(() => 'random-uuid-001'),
  },
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('abc123hash'),
  })),
  randomUUID: vi.fn(() => 'random-uuid-001'),
}));

import { ExecutionRepository } from '../db/repositories/execution.repository';
import type { ExecutionQueryFilters } from '../db/repositories/execution.repository';

describe('ExecutionRepository', () => {
  let repo: ExecutionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockReturnValue({ changes: 1 });
    mockAll.mockReturnValue([]);
    mockGet.mockReturnValue(undefined);
    mockPrepare.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
    mockTransaction.mockImplementation((fn: any) => fn);
    repo = new ExecutionRepository();
  });

  // -----------------------------------------------------------------------
  // sanitizeOutput — XSS prevention
  // -----------------------------------------------------------------------

  describe('sanitizeOutput (via findById)', () => {
    it('strips XSS characters from response field', () => {
      const xssPayload = '<script>alert("xss")</script> & "test" \'quoted\'';
      mockGet.mockReturnValueOnce({
        id: 'exec-1',
        response: xssPayload,
        prompt: 'test prompt',
      });

      const result = repo.findById('exec-1');

      expect(result).not.toBeNull();
      expect(result!.response).not.toContain('<');
      expect(result!.response).not.toContain('>');
      expect(result!.response).toContain('&lt;');
      expect(result!.response).toContain('&gt;');
      expect(result!.response).toContain('&amp;');
      expect(result!.response).toContain('&quot;');
      expect(result!.response).toContain('&#x27;');
    });

    it('handles null response gracefully', () => {
      mockGet.mockReturnValueOnce({
        id: 'exec-2',
        response: null,
        prompt: 'test',
      });

      const result = repo.findById('exec-2');
      expect(result).not.toBeNull();
      expect(result!.response).toBeNull();
    });

    it('returns null when execution not found', () => {
      mockGet.mockReturnValueOnce(undefined);
      expect(repo.findById('nonexistent')).toBeNull();
    });

    it('encodes ampersands before other entities', () => {
      mockGet.mockReturnValueOnce({
        id: 'exec-3',
        response: '&lt;already-encoded&gt;',
        prompt: 'test',
      });

      const result = repo.findById('exec-3');
      // The & in &lt; should be encoded first, producing &amp;lt;
      expect(result!.response).toContain('&amp;lt;');
    });
  });

  // -----------------------------------------------------------------------
  // Content hash dedup
  // -----------------------------------------------------------------------

  describe('saveExecution — content hash dedup', () => {
    it('generates SHA256 content hash from prompt + model_config_id', () => {
      // No existing execution with this hash
      mockGet.mockReturnValueOnce(undefined);
      // create() calls prepare/run internally
      mockGet.mockReturnValueOnce({
        id: 'new-exec',
        prompt: 'test prompt',
        model_config_id: 'model-1',
        content_hash: 'abc123hash',
      });

      repo.saveExecution({
        prompt: 'test prompt',
        model_config_id: 'model-1',
      });

      // Verify content hash lookup was attempted
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('content_hash')
      );
    });

    it('marks as cached when duplicate hash found', () => {
      // The dedup flow:
      // 1. db.prepare('SELECT id FROM test_executions WHERE content_hash = ?').get(hash) -> existing
      // 2. this.update(existing.id, execution) -> uses prepare/run
      // 3. this.findById(existing.id) -> super.findById -> db.prepare('SELECT...').get(id)
      //
      // mockGet is shared across all prepare().get() calls, so we chain returns:
      // Call 1: hash lookup -> found existing
      // Call 2: update() internally calls findById() -> returns updated row
      // Call 3: saveExecution calls findById() again -> returns updated row
      const updatedRow = {
        id: 'existing-exec',
        prompt: 'test prompt',
        model_config_id: 'model-1',
        cached: 1,
        response: null,
      };
      mockGet
        .mockReturnValueOnce({ id: 'existing-exec' }) // hash lookup
        .mockReturnValueOnce(updatedRow)               // update's internal findById
        .mockReturnValueOnce(updatedRow);              // saveExecution's findById

      const result = repo.saveExecution({
        prompt: 'test prompt',
        model_config_id: 'model-1',
        content_hash: 'abc123hash',
      });

      expect(result.id).toBe('existing-exec');
      expect(result.cached).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // saveExecution — coverage junction tables
  // -----------------------------------------------------------------------

  describe('saveExecution — coverage tables', () => {
    it('inserts OWASP coverage records', () => {
      mockGet
        .mockReturnValueOnce(undefined) // no existing hash
        .mockReturnValueOnce({          // create returns
          id: 'exec-new',
          prompt: 'test',
          model_config_id: 'model-1',
        });

      repo.saveExecution(
        { prompt: 'test', model_config_id: 'model-1' },
        [{ category: 'LLM01', passed: true }, { category: 'LLM02', passed: false }],
      );

      // Verify OWASP coverage INSERT was prepared
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('execution_owasp_coverage')
      );
      // Two coverage entries
      expect(mockRun).toHaveBeenCalledWith('exec-new', 'LLM01', 1);
      expect(mockRun).toHaveBeenCalledWith('exec-new', 'LLM02', 0);
    });

    it('inserts TPI coverage records', () => {
      mockGet
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({
          id: 'exec-tpi',
          prompt: 'tpi test',
          model_config_id: 'model-2',
        });

      repo.saveExecution(
        { prompt: 'tpi test', model_config_id: 'model-2' },
        undefined,
        [{ story: 'TPI-01', passed: true }],
      );

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('execution_tpi_coverage')
      );
      expect(mockRun).toHaveBeenCalledWith('exec-tpi', 'TPI-01', 1);
    });

    it('inserts scan findings', () => {
      mockGet
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({
          id: 'exec-findings',
          prompt: 'findings test',
          model_config_id: 'model-3',
        });

      repo.saveExecution(
        { prompt: 'findings test', model_config_id: 'model-3' },
        undefined,
        undefined,
        [{ category: 'injection', severity: 'HIGH', description: 'found XSS' }],
      );

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('scan_findings')
      );
    });
  });

  // -----------------------------------------------------------------------
  // queryExecutions — SQL filter building
  // -----------------------------------------------------------------------

  describe('queryExecutions', () => {
    it('returns paginated result with default limit/offset', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);

      const result = repo.queryExecutions({});

      expect(result).toEqual({
        data: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it('applies modelId filter', () => {
      mockGet.mockReturnValueOnce({ total: 1 });
      mockAll.mockReturnValueOnce([
        { id: 'e1', model_config_id: 'model-x', response: 'safe text' },
      ]);

      const result = repo.queryExecutions({ modelId: 'model-x' });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      // Verify prepare was called with SQL containing model_config_id
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('model_config_id')
      );
    });

    it('applies score range filters', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);

      repo.queryExecutions({ minScore: 50, maxScore: 90 });

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('resilience_score')
      );
    });

    it('applies date range filters', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);

      repo.queryExecutions({
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('executed_at')
      );
    });

    it('sanitizes response fields in results', () => {
      mockGet.mockReturnValueOnce({ total: 1 });
      mockAll.mockReturnValueOnce([
        { id: 'e1', response: '<script>alert(1)</script>' },
      ]);

      const result = repo.queryExecutions({});
      expect(result.data[0].response).toContain('&lt;script&gt;');
      expect(result.data[0].response).not.toContain('<script>');
    });

    it('respects custom limit and offset', () => {
      mockGet.mockReturnValueOnce({ total: 200 });
      mockAll.mockReturnValueOnce([]);

      const result = repo.queryExecutions({}, 10, 20);

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });
  });

  // -----------------------------------------------------------------------
  // getStats — aggregated model statistics
  // -----------------------------------------------------------------------

  describe('getStats', () => {
    it('returns aggregated scores for a model', () => {
      mockGet.mockReturnValueOnce({
        total_tests: 10,
        avg_resilience: 85.5,
        avg_injection: 0.15,
        avg_harmfulness: 0.05,
        pass_rate: 90.0,
      });

      const stats = repo.getStats('model-1');

      expect(stats).toEqual({
        totalTests: 10,
        avgResilienceScore: 85.5,
        avgInjectionSuccess: 0.15,
        avgHarmfulness: 0.05,
        passRate: 90.0,
      });
    });

    it('handles null values from empty result set', () => {
      mockGet.mockReturnValueOnce({
        total_tests: null,
        avg_resilience: null,
        avg_injection: null,
        avg_harmfulness: null,
        pass_rate: null,
      });

      const stats = repo.getStats('empty-model');

      expect(stats).toEqual({
        totalTests: 0,
        avgResilienceScore: 0,
        avgInjectionSuccess: 0,
        avgHarmfulness: 0,
        passRate: 0,
      });
    });

    it('queries only completed executions for the model', () => {
      mockGet.mockReturnValueOnce({
        total_tests: 5,
        avg_resilience: 70,
        avg_injection: 0.2,
        avg_harmfulness: 0.1,
        pass_rate: 60,
      });

      repo.getStats('model-2');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("status = 'completed'")
      );
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('model_config_id')
      );
    });
  });

  // -----------------------------------------------------------------------
  // getFindings — sanitized finding retrieval
  // -----------------------------------------------------------------------

  describe('getFindings', () => {
    it('sanitizes match_text in findings', () => {
      mockAll.mockReturnValueOnce([
        { id: 'f1', execution_id: 'e1', match_text: '<img onerror="alert(1)">' },
        { id: 'f2', execution_id: 'e1', match_text: null },
      ]);

      const findings = repo.getFindings('e1');

      expect(findings).toHaveLength(2);
      expect(findings[0].match_text).toContain('&lt;img');
      expect(findings[0].match_text).not.toContain('<img');
      expect(findings[1].match_text).toBeNull();
    });

    it('orders findings by severity then created_at', () => {
      mockAll.mockReturnValueOnce([]);

      repo.getFindings('e1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY severity, created_at')
      );
    });
  });

  // -----------------------------------------------------------------------
  // getEvidence
  // -----------------------------------------------------------------------

  describe('getEvidence', () => {
    it('returns evidence records for an execution', () => {
      mockAll.mockReturnValueOnce([
        { id: 'ev1', execution_id: 'e1', content: 'evidence data' },
      ]);

      const evidence = repo.getEvidence('e1');
      expect(evidence).toHaveLength(1);
      expect(evidence[0].id).toBe('ev1');
    });

    it('orders evidence by created_at', () => {
      mockAll.mockReturnValueOnce([]);

      repo.getEvidence('e1');

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at')
      );
    });
  });
});
