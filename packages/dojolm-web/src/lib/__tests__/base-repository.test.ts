import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database module
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

import { BaseRepository } from '../db/repositories/base.repository';

// Concrete test subclass
class TestRepository extends BaseRepository<{ id: string; name: string; status: string }> {
  constructor() {
    super('test_table', 'id');
  }
}

describe('BaseRepository', () => {
  let repo: TestRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockReturnValue({ changes: 1 });
    mockAll.mockReturnValue([]);
    mockPrepare.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
    mockTransaction.mockImplementation((fn: any) => fn);
    repo = new TestRepository();
  });

  describe('findById', () => {
    it('returns entity when found', () => {
      mockGet.mockReturnValueOnce({ id: '1', name: 'test', status: 'active' });
      const result = repo.findById('1');
      expect(result).toEqual({ id: '1', name: 'test', status: 'active' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    it('returns null when not found', () => {
      mockGet.mockReturnValueOnce(undefined);
      expect(repo.findById('999')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all entities', () => {
      mockAll.mockReturnValueOnce([{ id: '1', name: 'a' }, { id: '2', name: 'b' }]);
      const results = repo.findAll();
      expect(results).toHaveLength(2);
    });

    it('applies where clause', () => {
      mockAll.mockReturnValueOnce([]);
      repo.findAll({ where: { status: 'active' } });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('WHERE'));
    });

    it('applies limit and offset', () => {
      mockAll.mockReturnValueOnce([]);
      repo.findAll({ limit: 10, offset: 20 });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT'));
    });

    it('applies ordering', () => {
      mockAll.mockReturnValueOnce([]);
      repo.findAll({ orderBy: 'name', orderDir: 'ASC' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY'));
    });
  });

  describe('create', () => {
    it('inserts entity and returns it', () => {
      // First call: INSERT run, Second call: SELECT (findById) after insert
      mockGet.mockReturnValueOnce({ id: '1', name: 'new', status: 'active' });
      const result = repo.create({ id: '1', name: 'new', status: 'active' });
      expect(result).toEqual({ id: '1', name: 'new', status: 'active' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT'));
    });
  });

  describe('update', () => {
    it('updates entity and returns it', () => {
      // findById after update
      mockGet.mockReturnValueOnce({ id: '1', name: 'updated', status: 'active' });
      const result = repo.update('1', { name: 'updated' });
      expect(result).toEqual({ id: '1', name: 'updated', status: 'active' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE'));
    });

    it('returns null when entity not found after update', () => {
      mockGet.mockReturnValueOnce(undefined);
      expect(repo.update('999', { name: 'x' })).toBeNull();
    });

    it('returns current entity when no fields to update', () => {
      mockGet.mockReturnValueOnce({ id: '1', name: 'test', status: 'active' });
      const result = repo.update('1', {});
      expect(result).toEqual({ id: '1', name: 'test', status: 'active' });
    });
  });

  describe('delete', () => {
    it('deletes entity and returns true', () => {
      mockRun.mockReturnValueOnce({ changes: 1 });
      expect(repo.delete('1')).toBe(true);
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('DELETE'));
    });

    it('returns false when not found', () => {
      mockRun.mockReturnValueOnce({ changes: 0 });
      expect(repo.delete('999')).toBe(false);
    });
  });

  describe('count', () => {
    it('returns count', () => {
      mockGet.mockReturnValueOnce({ total: 5 });
      expect(repo.count()).toBe(5);
    });

    it('applies where filter', () => {
      mockGet.mockReturnValueOnce({ total: 2 });
      repo.count({ status: 'active' });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('WHERE'));
    });
  });

  describe('findPaginated', () => {
    it('returns paginated result with data and total', () => {
      // count query first, then select query
      mockGet.mockReturnValueOnce({ total: 10 });
      mockAll.mockReturnValueOnce([{ id: '1', name: 'a', status: 'active' }]);
      const result = repo.findPaginated({ limit: 5, offset: 0 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
    });

    it('uses default limit and offset', () => {
      mockGet.mockReturnValueOnce({ total: 0 });
      mockAll.mockReturnValueOnce([]);
      const result = repo.findPaginated();
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });

  describe('withTransaction', () => {
    it('wraps function in transaction and executes it', () => {
      const innerFn = vi.fn().mockReturnValue('result');
      mockTransaction.mockImplementation((fn: any) => {
        // transaction() returns a callable that invokes fn
        return () => fn();
      });
      const result = repo.withTransaction(innerFn);
      expect(result).toBe('result');
      expect(mockTransaction).toHaveBeenCalledWith(innerFn);
      expect(innerFn).toHaveBeenCalled();
    });
  });

  describe('column validation', () => {
    it('rejects SQL injection in orderBy', () => {
      expect(() => repo.findAll({ orderBy: 'name; DROP TABLE' })).toThrow();
    });

    it('rejects special characters in column names', () => {
      expect(() => repo.findAll({ orderBy: 'name--comment' })).toThrow();
    });

    it('allows valid column names', () => {
      mockAll.mockReturnValueOnce([]);
      expect(() => repo.findAll({ orderBy: 'created_at' })).not.toThrow();
    });
  });

  describe('where clause handling', () => {
    it('handles null values with IS NULL', () => {
      mockAll.mockReturnValueOnce([]);
      repo.findAll({ where: { status: null } });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('IS NULL'));
    });

    it('handles array values with IN clause', () => {
      mockAll.mockReturnValueOnce([]);
      repo.findAll({ where: { status: ['active', 'pending'] } });
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('IN'));
    });

    it('skips undefined values', () => {
      mockAll.mockReturnValueOnce([]);
      repo.findAll({ where: { status: undefined } });
      // Should not have WHERE clause since the only key was undefined
      const calls = mockPrepare.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).not.toContain('WHERE');
    });
  });
});
