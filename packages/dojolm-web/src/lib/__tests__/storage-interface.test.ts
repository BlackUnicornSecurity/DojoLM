import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getStorageBackendType,
  getStorage,
  getStorageSync,
} from '../storage/storage-interface';
import type { StorageBackendType, IStorageBackend } from '../storage/storage-interface';

// ---------------------------------------------------------------------------
// Mocks — dynamic imports for file-storage and db-storage
// ---------------------------------------------------------------------------

const mockFileStorage: IStorageBackend = {
  getModelConfigs: vi.fn(),
  getModelConfig: vi.fn(),
  saveModelConfig: vi.fn(),
  deleteModelConfig: vi.fn(),
  setModelConfigEnabled: vi.fn(),
  getTestCases: vi.fn(),
  getTestCase: vi.fn(),
  saveTestCase: vi.fn(),
  deleteTestCase: vi.fn(),
  importTestCases: vi.fn(),
  saveExecution: vi.fn(),
  getExecution: vi.fn(),
  queryExecutions: vi.fn(),
  getRecentExecutions: vi.fn(),
  deleteExecution: vi.fn(),
  clearOldExecutions: vi.fn(),
  createBatch: vi.fn(),
  getBatch: vi.fn(),
  updateBatch: vi.fn(),
  queryBatches: vi.fn(),
  getBatchExecutions: vi.fn(),
  deleteBatch: vi.fn(),
  getModelStats: vi.fn(),
  getSystemStats: vi.fn(),
  cleanup: vi.fn(),
  healthCheck: vi.fn(),
};

const mockDbStorage: IStorageBackend = {
  ...mockFileStorage,
  // Mark it so we can distinguish from file storage
  getModelConfigs: vi.fn().mockResolvedValue([{ id: 'db-model' }]),
};

vi.mock('../storage/file-storage', () => ({
  fileStorage: mockFileStorage,
}));

vi.mock('../storage/db-storage', () => ({
  dbStorage: mockDbStorage,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('storage-interface', () => {
  const originalEnv = process.env.TPI_STORAGE_BACKEND;

  afterEach(() => {
    // Restore env
    if (originalEnv === undefined) {
      delete process.env.TPI_STORAGE_BACKEND;
    } else {
      process.env.TPI_STORAGE_BACKEND = originalEnv;
    }
  });

  // -------------------------------------------------------------------------
  // getStorageBackendType
  // -------------------------------------------------------------------------
  describe('getStorageBackendType', () => {
    it('defaults to json when env is not set', () => {
      delete process.env.TPI_STORAGE_BACKEND;
      expect(getStorageBackendType()).toBe('json');
    });

    it('returns json for empty string', () => {
      process.env.TPI_STORAGE_BACKEND = '';
      expect(getStorageBackendType()).toBe('json');
    });

    it('returns db when env is db', () => {
      process.env.TPI_STORAGE_BACKEND = 'db';
      expect(getStorageBackendType()).toBe('db');
    });

    it('returns json for unknown values', () => {
      process.env.TPI_STORAGE_BACKEND = 'redis';
      expect(getStorageBackendType()).toBe('json');
    });
  });

  // -------------------------------------------------------------------------
  // getStorageSync
  // -------------------------------------------------------------------------
  describe('getStorageSync', () => {
    it('returns cached storage when available', async () => {
      // Prime the cache via getStorage first
      delete process.env.TPI_STORAGE_BACKEND;
      const asyncStorage = await getStorage();
      const syncStorage = getStorageSync();
      // Should return the same cached instance
      expect(syncStorage).toBe(asyncStorage);
    });
  });

  // -------------------------------------------------------------------------
  // IStorageBackend interface contract (type-level check)
  // -------------------------------------------------------------------------
  describe('IStorageBackend interface contract', () => {
    it('mock implements all required methods', () => {
      const methods: Array<keyof IStorageBackend> = [
        'getModelConfigs',
        'getModelConfig',
        'saveModelConfig',
        'deleteModelConfig',
        'setModelConfigEnabled',
        'getTestCases',
        'getTestCase',
        'saveTestCase',
        'deleteTestCase',
        'importTestCases',
        'saveExecution',
        'getExecution',
        'queryExecutions',
        'getRecentExecutions',
        'deleteExecution',
        'clearOldExecutions',
        'createBatch',
        'getBatch',
        'updateBatch',
        'queryBatches',
        'getBatchExecutions',
        'deleteBatch',
        'getModelStats',
        'getSystemStats',
        'cleanup',
        'healthCheck',
      ];

      for (const method of methods) {
        expect(typeof mockFileStorage[method]).toBe('function');
      }
    });
  });
});
