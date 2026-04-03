import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRun = vi.fn().mockReturnValue({ changes: 1 });
const mockGet = vi.fn();
const mockAll = vi.fn().mockReturnValue([]);
const mockPrepare = vi.fn().mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });

vi.mock('../db/database', () => ({
  getDatabase: vi.fn(() => ({
    prepare: mockPrepare,
  })),
}));

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: vi.fn(() => 'test-uuid-1234'),
  },
}));

import { auditRepo } from '../db/repositories/audit.repository';

describe('AuditRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockReturnValue({ changes: 1 });
    mockAll.mockReturnValue([]);
    mockPrepare.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
  });

  describe('log', () => {
    it('inserts audit entry with INSERT statement', () => {
      auditRepo.log('user', 'user-1', 'create', null, { name: 'test' }, 'admin-1', '127.0.0.1');
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_log'));
      expect(mockRun).toHaveBeenCalled();
    });

    it('passes generated UUID as first argument', () => {
      auditRepo.log('user', 'user-1', 'create', null, { name: 'test' }, 'admin-1', '127.0.0.1');
      const callArgs = mockRun.mock.calls[0];
      expect(callArgs[0]).toBe('test-uuid-1234');
    });

    it('passes entity type, entity id, and action', () => {
      auditRepo.log('model', 'model-1', 'update', null, null, null, null);
      const callArgs = mockRun.mock.calls[0];
      expect(callArgs[1]).toBe('model');
      expect(callArgs[2]).toBe('model-1');
      expect(callArgs[3]).toBe('update');
    });

    it('redacts sensitive fields in new values', () => {
      auditRepo.log('model', 'model-1', 'update', null, { apiKey: 'sk-secret', name: 'test' }, 'admin-1', null);
      const callArgs = mockRun.mock.calls[0];
      // newValues is argument index 5 (serialized JSON)
      const newValuesJson = callArgs[5];
      expect(newValuesJson).not.toContain('sk-secret');
      expect(newValuesJson).toContain('[REDACTED]');
      expect(newValuesJson).toContain('test');
    });

    it('redacts api_key field in new values', () => {
      auditRepo.log('model', 'model-1', 'create', null, { api_key: 'key-123', name: 'test' }, null, null);
      const callArgs = mockRun.mock.calls[0];
      const newValuesJson = callArgs[5];
      expect(newValuesJson).not.toContain('key-123');
      expect(newValuesJson).toContain('[REDACTED]');
    });

    it('redacts sensitive fields in old values', () => {
      auditRepo.log('model', 'model-1', 'update', { password_hash: 'hash123', name: 'old' }, { name: 'new' }, null, null);
      const callArgs = mockRun.mock.calls[0];
      // oldValues is argument index 4 (serialized JSON)
      const oldValuesJson = callArgs[4];
      expect(oldValuesJson).not.toContain('hash123');
      expect(oldValuesJson).toContain('[REDACTED]');
    });

    it('redacts token_hash in values', () => {
      auditRepo.log('session', 's-1', 'create', null, { token_hash: 'tok-abc', active: true }, null, null);
      const callArgs = mockRun.mock.calls[0];
      const newValuesJson = callArgs[5];
      expect(newValuesJson).not.toContain('tok-abc');
      expect(newValuesJson).toContain('[REDACTED]');
    });

    it('handles null old and new values', () => {
      auditRepo.log('system', null, 'startup', null, null, null, null);
      expect(mockRun).toHaveBeenCalled();
      const callArgs = mockRun.mock.calls[0];
      // null values should be passed as null (not serialized)
      expect(callArgs[4]).toBeNull();
      expect(callArgs[5]).toBeNull();
    });

    it('serializes non-null values as JSON', () => {
      auditRepo.log('user', 'u-1', 'update', { name: 'old' }, { name: 'new' }, 'admin', '10.0.0.1');
      const callArgs = mockRun.mock.calls[0];
      expect(JSON.parse(callArgs[4])).toEqual({ name: 'old' });
      expect(JSON.parse(callArgs[5])).toEqual({ name: 'new' });
    });
  });

  describe('query', () => {
    it('queries with no filters', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);
      const result = auditRepo.query({});
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('applies entity type filter', () => {
      mockGet.mockReturnValueOnce({ total: 1 });
      mockAll.mockReturnValueOnce([{ id: '1', entity_type: 'user' }]);
      auditRepo.query({ entityType: 'user' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('entity_type'));
    });

    it('applies entity id filter', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);
      auditRepo.query({ entityId: 'user-1' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('entity_id'));
    });

    it('applies action filter', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);
      auditRepo.query({ action: 'create' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('action'));
    });

    it('applies user id filter', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);
      auditRepo.query({ userId: 'admin-1' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('user_id'));
    });

    it('applies date range filters', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);
      auditRepo.query({ dateFrom: '2026-01-01', dateTo: '2026-12-31' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('>='));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('<='));
    });

    it('returns paginated results with default limit/offset', () => {
      mockGet.mockReturnValueOnce({ total: 50 });
      mockAll.mockReturnValueOnce([{ id: '1', entity_type: 'user' }]);
      const result = auditRepo.query({});
      expect(result.total).toBe(50);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('uses custom limit and offset', () => {
      mockGet.mockReturnValueOnce({ total: 100 });
      mockAll.mockReturnValueOnce([]);
      const result = auditRepo.query({}, 10, 20);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('orders by created_at DESC', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);
      auditRepo.query({});
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at DESC'));
    });
  });
});
