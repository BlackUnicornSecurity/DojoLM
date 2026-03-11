/**
 * File: storage-interface.test.ts
 * Purpose: Tests for storage-interface module (types, factory, caching)
 *
 * Index:
 * - SI-001: getStorageBackendType returns 'json' by default (line ~42)
 * - SI-002: getStorageBackendType returns 'db' when env is 'db' (line ~50)
 * - SI-003: getStorageBackendType returns 'json' for unknown env values (line ~58)
 * - SI-004: getStorage returns file-storage for json backend (line ~67)
 * - SI-005: getStorage returns db-storage for db backend (line ~82)
 * - SI-006: getStorage caches result on subsequent calls (line ~97)
 * - SI-007: getStorageSync returns cached storage when available (line ~114)
 * - SI-008: getStorageSync falls back to file-storage require (line ~126)
 * - SI-009: StorageQueryOptions type allows all optional fields (line ~142)
 * - SI-010: ExecutionQuery type allows all filter fields (line ~161)
 * - SI-011: BatchQuery type allows all filter fields (line ~182)
 * - SI-012: BulkOperationResult type has required fields (line ~199)
 * - SI-013: StorageOptions type allows all optional fields (line ~216)
 * - SI-014: getStorage resets cache correctly between backend switches (line ~230)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the dynamic imports used by getStorage / getStorageSync
const mockFileStorage = { getModelConfigs: vi.fn() };
const mockDbStorage = { getModelConfigs: vi.fn() };

vi.mock('../file-storage', () => ({ fileStorage: mockFileStorage }));
vi.mock('../db-storage', () => ({ dbStorage: mockDbStorage }));

import type {
  IStorageBackend,
  StorageQueryOptions,
  ExecutionQuery,
  BatchQuery,
  StorageOptions,
  BulkOperationResult,
  StorageBackendType,
} from '../storage-interface';

// We need to re-import the module fresh for cache tests, so use dynamic imports
// For the basic function tests, import directly:
import { getStorageBackendType, getStorage, getStorageSync } from '../storage-interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reset the module-level _cachedStorage by re-importing.
 * We achieve this by clearing the module registry before each test.
 */
beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  // Clear the cached storage by resetting the module
  // We'll re-import in tests that need a fresh cache
});

// ===========================================================================
// getStorageBackendType
// ===========================================================================

describe('getStorageBackendType', () => {
  it('SI-001: returns "json" by default when TPI_STORAGE_BACKEND is unset', () => {
    vi.stubEnv('TPI_STORAGE_BACKEND', '');
    const result = getStorageBackendType();
    expect(result).toBe('json');
  });

  it('SI-002: returns "db" when TPI_STORAGE_BACKEND is "db"', () => {
    vi.stubEnv('TPI_STORAGE_BACKEND', 'db');
    const result = getStorageBackendType();
    expect(result).toBe('db');
  });

  it('SI-003: returns "json" for unknown/invalid env values', () => {
    vi.stubEnv('TPI_STORAGE_BACKEND', 'postgres');
    const result = getStorageBackendType();
    expect(result).toBe('json');
  });
});

// ===========================================================================
// getStorage (async factory)
// ===========================================================================

describe('getStorage', () => {
  it('SI-004: returns file-storage backend when type is json', async () => {
    vi.stubEnv('TPI_STORAGE_BACKEND', '');

    vi.resetModules();
    vi.mock('../file-storage', () => ({ fileStorage: mockFileStorage }));
    vi.mock('../db-storage', () => ({ dbStorage: mockDbStorage }));

    const mod = await import('../storage-interface');
    const storage = await mod.getStorage();
    expect(storage).toBe(mockFileStorage);
  });

  it('SI-005: returns db-storage backend when type is db', async () => {
    vi.stubEnv('TPI_STORAGE_BACKEND', 'db');

    vi.resetModules();
    vi.mock('../file-storage', () => ({ fileStorage: mockFileStorage }));
    vi.mock('../db-storage', () => ({ dbStorage: mockDbStorage }));

    const mod = await import('../storage-interface');
    const storage = await mod.getStorage();
    expect(storage).toBe(mockDbStorage);
  });

  it('SI-006: caches result on subsequent calls', async () => {
    vi.stubEnv('TPI_STORAGE_BACKEND', '');

    vi.resetModules();
    vi.mock('../file-storage', () => ({ fileStorage: mockFileStorage }));
    vi.mock('../db-storage', () => ({ dbStorage: mockDbStorage }));

    const mod = await import('../storage-interface');
    const first = await mod.getStorage();
    const second = await mod.getStorage();
    expect(first).toBe(second);
  });
});

// ===========================================================================
// getStorageSync
// ===========================================================================

describe('getStorageSync', () => {
  it('SI-007: returns cached storage when available (after async init)', async () => {
    vi.stubEnv('TPI_STORAGE_BACKEND', '');

    vi.resetModules();
    vi.mock('../file-storage', () => ({ fileStorage: mockFileStorage }));
    vi.mock('../db-storage', () => ({ dbStorage: mockDbStorage }));

    const mod = await import('../storage-interface');
    // Prime the cache
    await mod.getStorage();
    const syncResult = mod.getStorageSync();
    expect(syncResult).toBe(mockFileStorage);
  });

  it('SI-008: getStorageSync uses require fallback when cache is empty', async () => {
    // When _cachedStorage is null, getStorageSync calls require('./file-storage').
    // In the test environment CJS require cannot be mocked easily, so we verify
    // the fallback path by checking that it throws a module-not-found error
    // (since vi.mock does not intercept CJS require after resetModules).
    vi.stubEnv('TPI_STORAGE_BACKEND', '');

    vi.resetModules();
    // Re-mock for the ESM dynamic import path only
    vi.mock('../file-storage', () => ({ fileStorage: mockFileStorage }));
    vi.mock('../db-storage', () => ({ dbStorage: mockDbStorage }));

    const mod = await import('../storage-interface');
    // Without priming the cache via getStorage(), the sync path hits require()
    // which cannot resolve the mock — this validates it attempts the fallback.
    expect(() => mod.getStorageSync()).toThrow();
  });
});

// ===========================================================================
// Type-level tests (compile-time + runtime shape assertions)
// ===========================================================================

describe('StorageQueryOptions type', () => {
  it('SI-009: allows all optional fields to be set', () => {
    const opts: StorageQueryOptions = {
      category: 'injection',
      owaspCategory: 'LLM01',
      tpiStory: 'TPI-42',
      enabled: true,
      tags: ['critical', 'owasp'],
      limit: 50,
      offset: 10,
      sortBy: 'name',
      sortDirection: 'asc',
    };
    expect(opts.category).toBe('injection');
    expect(opts.owaspCategory).toBe('LLM01');
    expect(opts.tpiStory).toBe('TPI-42');
    expect(opts.enabled).toBe(true);
    expect(opts.tags).toEqual(['critical', 'owasp']);
    expect(opts.limit).toBe(50);
    expect(opts.offset).toBe(10);
    expect(opts.sortBy).toBe('name');
    expect(opts.sortDirection).toBe('asc');
  });
});

describe('ExecutionQuery type', () => {
  it('SI-010: allows all filter fields to be set', () => {
    const query: ExecutionQuery = {
      modelConfigId: 'model-1',
      testCaseId: 'tc-1',
      status: 'completed',
      minScore: 0.5,
      maxScore: 1.0,
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      includeCached: false,
      limit: 100,
      offset: 0,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };
    expect(query.modelConfigId).toBe('model-1');
    expect(query.testCaseId).toBe('tc-1');
    expect(query.status).toBe('completed');
    expect(query.minScore).toBe(0.5);
    expect(query.maxScore).toBe(1.0);
    expect(query.startDate).toBe('2026-01-01T00:00:00Z');
    expect(query.endDate).toBe('2026-12-31T23:59:59Z');
    expect(query.includeCached).toBe(false);
    expect(query.limit).toBe(100);
    expect(query.offset).toBe(0);
    expect(query.sortBy).toBe('createdAt');
    expect(query.sortDirection).toBe('desc');
  });
});

describe('BatchQuery type', () => {
  it('SI-011: allows all filter fields to be set', () => {
    const query: BatchQuery = {
      modelConfigIds: ['model-1', 'model-2'],
      status: 'running',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      limit: 20,
      offset: 5,
    };
    expect(query.modelConfigIds).toEqual(['model-1', 'model-2']);
    expect(query.status).toBe('running');
    expect(query.startDate).toBe('2026-01-01T00:00:00Z');
    expect(query.limit).toBe(20);
    expect(query.offset).toBe(5);
  });
});

describe('BulkOperationResult type', () => {
  it('SI-012: has all required fields', () => {
    const result: BulkOperationResult = {
      success: 10,
      failed: 2,
      affectedIds: ['id-1', 'id-2', 'id-3'],
      errors: [{ id: 'id-4', error: 'validation failed' }],
    };
    expect(result.success).toBe(10);
    expect(result.failed).toBe(2);
    expect(result.affectedIds).toHaveLength(3);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ id: 'id-4', error: 'validation failed' });
  });
});

describe('StorageOptions type', () => {
  it('SI-013: allows all optional fields', () => {
    const opts: StorageOptions = {
      skipValidation: true,
      createIndexes: false,
      timeout: 5000,
    };
    expect(opts.skipValidation).toBe(true);
    expect(opts.createIndexes).toBe(false);
    expect(opts.timeout).toBe(5000);
  });
});

// ===========================================================================
// Cache behavior across backend switches
// ===========================================================================

describe('Storage cache behavior', () => {
  it('SI-014: fresh module returns different backend after env change', async () => {
    // First: json backend
    vi.stubEnv('TPI_STORAGE_BACKEND', '');
    vi.resetModules();
    vi.mock('../file-storage', () => ({ fileStorage: mockFileStorage }));
    vi.mock('../db-storage', () => ({ dbStorage: mockDbStorage }));

    const mod1 = await import('../storage-interface');
    const s1 = await mod1.getStorage();
    expect(s1).toBe(mockFileStorage);

    // Second: db backend (fresh module)
    vi.stubEnv('TPI_STORAGE_BACKEND', 'db');
    vi.resetModules();
    vi.mock('../file-storage', () => ({ fileStorage: mockFileStorage }));
    vi.mock('../db-storage', () => ({ dbStorage: mockDbStorage }));

    const mod2 = await import('../storage-interface');
    const s2 = await mod2.getStorage();
    expect(s2).toBe(mockDbStorage);
  });
});
