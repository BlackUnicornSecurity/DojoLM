import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRun = vi.fn().mockReturnValue({ changes: 0 });
const mockGet = vi.fn();
const mockAll = vi.fn().mockReturnValue([]);
const mockPrepare = vi.fn().mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });

vi.mock('../db/database', () => ({
  getDatabase: vi.fn(() => ({
    prepare: mockPrepare,
  })),
}));

import { getRetentionConfig, updateRetentionConfig, runRetention } from '../db/retention';

describe('retention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockReturnValue({ changes: 0 });
    mockAll.mockReturnValue([]);
    mockPrepare.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
  });

  describe('getRetentionConfig', () => {
    it('returns config rows from retention_config table', () => {
      mockAll.mockReturnValueOnce([
        { entity_type: 'test_executions', retention_days: 90 },
        { entity_type: 'audit_log', retention_days: 365 },
      ]);
      const config = getRetentionConfig();
      expect(config).toHaveLength(2);
      expect(config[0].entity_type).toBe('test_executions');
      expect(config[1].retention_days).toBe(365);
    });

    it('returns empty array when no config exists', () => {
      mockAll.mockReturnValueOnce([]);
      const config = getRetentionConfig();
      expect(config).toHaveLength(0);
    });

    it('queries with ORDER BY entity_type', () => {
      mockAll.mockReturnValueOnce([]);
      getRetentionConfig();
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY entity_type'));
    });
  });

  describe('updateRetentionConfig', () => {
    it('updates retention days for an entity type', () => {
      updateRetentionConfig('test_executions', 180);
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE retention_config'));
      expect(mockRun).toHaveBeenCalledWith(180, 'test_executions');
    });

    it('updates audit_log retention days', () => {
      updateRetentionConfig('audit_log', 730);
      expect(mockRun).toHaveBeenCalledWith(730, 'audit_log');
    });
  });

  describe('runRetention', () => {
    it('returns empty results when no config exists', () => {
      // getRetentionConfig returns empty
      mockAll.mockReturnValueOnce([]);
      const results = runRetention();
      expect(results).toHaveLength(0);
    });

    it('processes each configured entity type', () => {
      // First call: getRetentionConfig
      mockAll.mockReturnValueOnce([
        { entity_type: 'test_executions', retention_days: 90 },
        { entity_type: 'audit_log', retention_days: 365 },
      ]);
      // Delete runs return 0 changes (nothing to delete)
      mockRun.mockReturnValue({ changes: 0 });

      const results = runRetention();
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('reports deletedCount for each entity type', () => {
      mockAll.mockReturnValueOnce([
        { entity_type: 'test_executions', retention_days: 90 },
      ]);
      mockRun.mockReturnValue({ changes: 0 });

      const results = runRetention();
      const execResult = results.find((r) => r.entityType === 'test_executions');
      expect(execResult).toBeDefined();
      expect(execResult!.deletedCount).toBe(0);
      expect(execResult!.retentionDays).toBe(90);
    });

    it('skips scan_findings and evidence_records (cascade from test_executions)', () => {
      mockAll.mockReturnValueOnce([
        { entity_type: 'scan_findings', retention_days: 90 },
        { entity_type: 'evidence_records', retention_days: 90 },
      ]);
      mockRun.mockReturnValue({ changes: 0 });

      const results = runRetention();
      // These should be in results with 0 deletedCount
      for (const r of results) {
        expect(r.deletedCount).toBe(0);
      }
    });

    it('skips entity types not in the hardcoded table map', () => {
      mockAll.mockReturnValueOnce([
        { entity_type: 'unknown_table', retention_days: 30 },
      ]);
      mockRun.mockReturnValue({ changes: 0 });

      const results = runRetention();
      // Unknown entity types are skipped entirely
      expect(results).toHaveLength(0);
    });

    it('skips entity types with invalid retention_days', () => {
      mockAll.mockReturnValueOnce([
        { entity_type: 'test_executions', retention_days: 0 },
        { entity_type: 'audit_log', retention_days: -1 },
      ]);
      mockRun.mockReturnValue({ changes: 0 });

      const results = runRetention();
      // Both should be skipped due to non-positive retention_days
      expect(results).toHaveLength(0);
    });

    it('accumulates batch deletions correctly', () => {
      mockAll.mockReturnValueOnce([
        { entity_type: 'sessions', retention_days: 30 },
      ]);
      // First batch deletes 1000 (BATCH_SIZE), triggering another batch
      // Second batch deletes 500, which is less than BATCH_SIZE so loop stops
      let callCount = 0;
      mockRun.mockImplementation(() => {
        callCount++;
        // Delete calls: 1st = 1000, 2nd = 500, then update last_run_at
        if (callCount === 1) return { changes: 1000 };
        if (callCount === 2) return { changes: 500 };
        return { changes: 0 };
      });

      const results = runRetention();
      const sessionResult = results.find((r) => r.entityType === 'sessions');
      expect(sessionResult).toBeDefined();
      expect(sessionResult!.deletedCount).toBe(1500);
    });

    it('updates last_run_at after processing', () => {
      mockAll.mockReturnValueOnce([
        { entity_type: 'test_executions', retention_days: 90 },
      ]);
      mockRun.mockReturnValue({ changes: 0 });

      runRetention();
      // Should have called prepare with an UPDATE for last_run_at
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE retention_config SET last_run_at')
      );
    });
  });
});
