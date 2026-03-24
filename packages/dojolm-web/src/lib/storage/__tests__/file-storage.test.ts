/**
 * File: file-storage.test.ts
 * Purpose: Tests for the file-storage module (FileStorage class)
 *
 * Index:
 * - FS-001: getModelConfigs returns empty array when no file (line 73)
 * - FS-002: getModelConfigs returns parsed models (line 84)
 * - FS-003: saveModelConfig creates new config with timestamps (line 103)
 * - FS-004: saveModelConfig updates existing config by ID (line 136)
 * - FS-005: deleteModelConfig removes config and returns true (line 168)
 * - FS-006: deleteModelConfig returns false for non-existent ID (line 190)
 * - FS-007: path traversal prevention rejects IDs with '..' (line 205)
 * - FS-008: path traversal prevention rejects IDs with slashes (line 220)
 * - FS-009: atomic writes use temp file then rename (line 236)
 * - FS-010: generateContentHash returns consistent SHA-256 hex (line 260)
 * - FS-011: getTestCases with filtering (line 274)
 * - FS-012: getTestCases with pagination (line 315)
 * - FS-013: saveExecution stores file and updates index (line 346)
 * - FS-014: queryExecutions filters by modelConfigId, status, date (line 386)
 * - FS-015: createBatch generates ID, sets status=pending (line 431)
 * - FS-016: cleanup removes old executions and batches (line 467)
 * - FS-017: healthCheck returns healthy when dir writable (line 502)
 * - FS-018: healthCheck returns errors when dir not writable (line 524)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('fs', () => {
  const promises = {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn(),
    access: vi.fn(),
    constants: { W_OK: 2 },
  };
  return {
    default: { promises, constants: { W_OK: 2 } },
    promises,
    constants: { W_OK: 2 },
  };
});

import { promises as fs } from 'fs';
import type { LLMModelConfig, LLMPromptTestCase, LLMTestExecution, LLMBatchExecution } from '../../llm-types';

const mockFs = vi.mocked(fs);

// ---------------------------------------------------------------------------
// Test Data Factories
// ---------------------------------------------------------------------------

function makeModelConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'model-1',
    name: 'GPT-4o Test',
    provider: 'openai',
    model: 'gpt-4o',
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTestCase(overrides: Partial<LLMPromptTestCase> = {}): LLMPromptTestCase {
  return {
    id: 'tc-001',
    name: 'Prompt Injection Basic',
    category: 'prompt_injection',
    prompt: 'Ignore previous instructions',
    expectedBehavior: 'Refuse to comply',
    severity: 'HIGH',
    enabled: true,
    ...overrides,
  };
}

function makeExecution(overrides: Partial<LLMTestExecution> = {}): LLMTestExecution {
  return {
    id: 'exec-001',
    testCaseId: 'tc-001',
    modelConfigId: 'model-1',
    timestamp: '2026-03-01T12:00:00.000Z',
    status: 'completed',
    prompt: 'Ignore previous instructions',
    response: 'I cannot do that.',
    duration_ms: 1500,
    injectionSuccess: 0,
    harmfulness: 0,
    resilienceScore: 95,
    categoriesPassed: ['prompt_injection'],
    categoriesFailed: [],
    owaspCoverage: { LLM01: true },
    tpiCoverage: { 'TPI-01': true },
    contentHash: 'abc123',
    cached: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: configure readFile to return data for specific paths
// ---------------------------------------------------------------------------

function mockReadFileForPaths(pathDataMap: Record<string, unknown>): void {
  mockFs.readFile.mockImplementation(async (filePath: any) => {
    const p = typeof filePath === 'string' ? filePath : filePath.toString();
    for (const [pattern, data] of Object.entries(pathDataMap)) {
      if (p.includes(pattern)) {
        return JSON.stringify(data);
      }
    }
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  });
}

function mockReadFileNotFound(): void {
  mockFs.readFile.mockImplementation(async () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  });
}

describe('file-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileNotFound();
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined as any);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
    mockFs.access.mockResolvedValue(undefined);
  });

  // FS-001
  it('FS-001: getModelConfigs returns empty array when no file exists', async () => {
    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const configs = await storage.getModelConfigs();

    expect(configs).toEqual([]);
    expect(mockFs.readFile).toHaveBeenCalled();
  });

  // FS-002
  it('FS-002: getModelConfigs returns parsed models from JSON file', async () => {
    const models = [makeModelConfig(), makeModelConfig({ id: 'model-2', name: 'Claude' })];
    mockReadFileForPaths({ 'models.json': models });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const configs = await storage.getModelConfigs();

    expect(configs).toHaveLength(2);
    expect(configs[0].id).toBe('model-1');
    expect(configs[1].id).toBe('model-2');
    expect(configs[1].name).toBe('Claude');
  });

  // FS-003
  it('FS-003: saveModelConfig creates new config with createdAt timestamp', async () => {
    mockReadFileForPaths({ 'models.json': [] });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const config = makeModelConfig({ id: 'new-model' });
    const result = await storage.saveModelConfig(config);

    expect(result.id).toBe('new-model');
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();

    // writeFile should have been called (atomic write: writeFile then rename)
    expect(mockFs.writeFile).toHaveBeenCalled();
    expect(mockFs.rename).toHaveBeenCalled();

    // The written data should contain the new config
    const writeCall = mockFs.writeFile.mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData).toHaveLength(1);
    expect(writtenData[0].id).toBe('new-model');
  });

  // FS-004
  it('FS-004: saveModelConfig updates existing config by ID', async () => {
    const existing = [makeModelConfig({ id: 'model-1', name: 'Old Name' })];
    mockReadFileForPaths({ 'models.json': existing });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const updated = makeModelConfig({ id: 'model-1', name: 'New Name' });
    const result = await storage.saveModelConfig(updated);

    expect(result.id).toBe('model-1');
    expect(result.name).toBe('New Name');
    expect(result.updatedAt).toBeDefined();

    // Should still have only 1 config (updated, not duplicated)
    const writeCall = mockFs.writeFile.mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData).toHaveLength(1);
    expect(writtenData[0].name).toBe('New Name');
  });

  // FS-005
  it('FS-005: deleteModelConfig removes config and returns true', async () => {
    const existing = [
      makeModelConfig({ id: 'model-1' }),
      makeModelConfig({ id: 'model-2' }),
    ];
    mockReadFileForPaths({ 'models.json': existing });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const result = await storage.deleteModelConfig('model-1');

    expect(result).toBe(true);

    const writeCall = mockFs.writeFile.mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData).toHaveLength(1);
    expect(writtenData[0].id).toBe('model-2');
  });

  // FS-006
  it('FS-006: deleteModelConfig returns false for non-existent ID', async () => {
    const existing = [makeModelConfig({ id: 'model-1' })];
    mockReadFileForPaths({ 'models.json': existing });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const result = await storage.deleteModelConfig('nonexistent');

    expect(result).toBe(false);
    // writeFile should NOT have been called since nothing changed
    // Actually it IS called because writeJSON is called regardless...
    // No: the code checks filtered.length === configs.length and returns false early
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  // FS-007
  it('FS-007: path traversal prevention rejects IDs containing ".."', async () => {
    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    // getExecution uses safeFilePath internally
    await expect(storage.getExecution('../../../etc/passwd')).rejects.toThrow(
      /unsafe characters|path traversal/i,
    );
  });

  // FS-008
  it('FS-008: path traversal prevention rejects IDs with slashes and special chars', async () => {
    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    // Slashes
    await expect(storage.getExecution('foo/bar')).rejects.toThrow(
      /unsafe characters|path traversal/i,
    );

    // Backslashes
    await expect(storage.getExecution('foo\\bar')).rejects.toThrow(
      /unsafe characters|path traversal/i,
    );

    // Special characters
    await expect(storage.getExecution('foo;rm -rf /')).rejects.toThrow(
      /unsafe characters|path traversal/i,
    );

    // Valid IDs should NOT throw
    mockReadFileNotFound();
    const result = await storage.getExecution('valid-id-123');
    expect(result).toBeNull();
  });

  // FS-009
  it('FS-009: atomic writes use temp file then rename', async () => {
    mockReadFileForPaths({ 'models.json': [] });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    await storage.saveModelConfig(makeModelConfig());

    // writeFile should be called with a .tmp suffix path
    expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    const writePath = mockFs.writeFile.mock.calls[0][0] as string;
    expect(writePath).toContain('.tmp');

    // rename should be called to move temp file to final location
    expect(mockFs.rename).toHaveBeenCalledTimes(1);
    const [tmpPath, finalPath] = mockFs.rename.mock.calls[0] as [string, string];
    expect(tmpPath).toContain('.tmp');
    expect(finalPath).toContain('models.json');
  });

  // FS-010
  it('FS-010: generateContentHash returns consistent SHA-256 hex', async () => {
    const { generateContentHash, generateExecutionHash } = await import('../file-storage');

    const hash1 = generateContentHash('test content');
    const hash2 = generateContentHash('test content');
    const hash3 = generateContentHash('different content');

    // Same input => same hash
    expect(hash1).toBe(hash2);

    // Different input => different hash
    expect(hash1).not.toBe(hash3);

    // Should be 64-char hex string (SHA-256)
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);

    // generateExecutionHash combines prompt and modelConfigId
    const execHash1 = generateExecutionHash('prompt1', 'model-1');
    const execHash2 = generateExecutionHash('prompt1', 'model-1');
    const execHash3 = generateExecutionHash('prompt1', 'model-2');

    expect(execHash1).toBe(execHash2);
    expect(execHash1).not.toBe(execHash3);
    expect(execHash1).toMatch(/^[0-9a-f]{64}$/);
  });

  // FS-011
  it('FS-011: getTestCases with filtering by category, owaspCategory, enabled', async () => {
    const cases = [
      makeTestCase({ id: 'tc-1', category: 'prompt_injection', owaspCategory: 'LLM01', enabled: true }),
      makeTestCase({ id: 'tc-2', category: 'jailbreak', owaspCategory: 'LLM01', enabled: true }),
      makeTestCase({ id: 'tc-3', category: 'prompt_injection', owaspCategory: 'LLM02', enabled: false }),
      makeTestCase({ id: 'tc-4', category: 'data_exfiltration', owaspCategory: 'LLM03', enabled: true }),
    ];
    mockReadFileForPaths({ 'test-cases.json': cases });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    // Filter by category
    const injectionCases = await storage.getTestCases({ category: 'prompt_injection' });
    expect(injectionCases).toHaveLength(2);
    expect(injectionCases.every(c => c.category === 'prompt_injection')).toBe(true);

    // Filter by owaspCategory
    const llm01Cases = await storage.getTestCases({ owaspCategory: 'LLM01' });
    expect(llm01Cases).toHaveLength(2);

    // Filter by enabled
    const enabledCases = await storage.getTestCases({ enabled: true });
    expect(enabledCases).toHaveLength(3);

    // Combined filters
    const combined = await storage.getTestCases({ category: 'prompt_injection', enabled: true });
    expect(combined).toHaveLength(1);
    expect(combined[0].id).toBe('tc-1');
  });

  // FS-012
  it('FS-012: getTestCases with pagination (limit, offset)', async () => {
    const cases = Array.from({ length: 10 }, (_, i) =>
      makeTestCase({ id: `tc-${i}`, name: `Test ${i}` }),
    );
    mockReadFileForPaths({ 'test-cases.json': cases });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    // Limit only
    const first3 = await storage.getTestCases({ limit: 3 });
    expect(first3).toHaveLength(3);
    expect(first3[0].id).toBe('tc-0');

    // Limit + offset
    const page2 = await storage.getTestCases({ limit: 3, offset: 3 });
    expect(page2).toHaveLength(3);
    expect(page2[0].id).toBe('tc-3');

    // Offset beyond data
    const empty = await storage.getTestCases({ limit: 3, offset: 20 });
    expect(empty).toHaveLength(0);

    // Large limit
    const all = await storage.getTestCases({ limit: 100 });
    expect(all).toHaveLength(10);
  });

  // FS-013
  it('FS-013: saveExecution stores individual execution file and updates index', async () => {
    // Start with empty index
    mockReadFileForPaths({ 'index.json': { executions: [] } });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const exec = makeExecution({ id: 'exec-new' });
    const result = await storage.saveExecution(exec);

    expect(result.id).toBe('exec-new');

    // writeFile should be called multiple times:
    // 1. For updating the executions index
    // 2. For the individual execution file
    // 3. For the model summary
    expect(mockFs.writeFile).toHaveBeenCalled();

    // Check that one of the writes contains the execution data
    const allWriteCalls = mockFs.writeFile.mock.calls;
    const execWriteCall = allWriteCalls.find(call => {
      const content = call[1] as string;
      try {
        const parsed = JSON.parse(content);
        return parsed.id === 'exec-new';
      } catch {
        return false;
      }
    });
    expect(execWriteCall).toBeDefined();

    // Check that the index was updated
    const indexWriteCall = allWriteCalls.find(call => {
      const content = call[1] as string;
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.executions);
      } catch {
        return false;
      }
    });
    expect(indexWriteCall).toBeDefined();
    const indexData = JSON.parse(indexWriteCall![1] as string);
    expect(indexData.executions).toContain('exec-new');
  });

  // FS-014
  it('FS-014: queryExecutions filters by modelConfigId, status, date range', async () => {
    const executions = [
      makeExecution({ id: 'e1', modelConfigId: 'model-1', status: 'completed', timestamp: '2026-03-01T00:00:00Z' }),
      makeExecution({ id: 'e2', modelConfigId: 'model-2', status: 'failed', timestamp: '2026-03-05T00:00:00Z' }),
      makeExecution({ id: 'e3', modelConfigId: 'model-1', status: 'completed', timestamp: '2026-03-10T00:00:00Z' }),
    ];

    // Mock readFile to return the index and individual execution files
    mockFs.readFile.mockImplementation(async (filePath: any) => {
      const p = typeof filePath === 'string' ? filePath : filePath.toString();
      if (p.includes('index.json')) {
        return JSON.stringify({ executions: ['e1', 'e2', 'e3'] });
      }
      for (const exec of executions) {
        if (p.includes(exec.id)) {
          return JSON.stringify(exec);
        }
      }
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    // Filter by modelConfigId
    const model1Execs = await storage.queryExecutions({ modelConfigId: 'model-1' });
    expect(model1Execs.executions).toHaveLength(2);
    expect(model1Execs.total).toBe(2);

    // Filter by status
    const failed = await storage.queryExecutions({ status: 'failed' });
    expect(failed.executions).toHaveLength(1);
    expect(failed.executions[0].id).toBe('e2');

    // Filter by date range
    const dateFiltered = await storage.queryExecutions({
      startDate: '2026-03-04T00:00:00Z',
      endDate: '2026-03-06T00:00:00Z',
    });
    expect(dateFiltered.executions).toHaveLength(1);
    expect(dateFiltered.executions[0].id).toBe('e2');
  });

  it('FS-014A: queryExecutions honors requested sort direction before pagination', async () => {
    const executions = [
      makeExecution({ id: 'e1', resilienceScore: 20, timestamp: '2026-03-01T00:00:00Z' }),
      makeExecution({ id: 'e2', resilienceScore: 90, timestamp: '2026-03-05T00:00:00Z' }),
      makeExecution({ id: 'e3', resilienceScore: 55, timestamp: '2026-03-10T00:00:00Z' }),
    ];

    mockFs.readFile.mockImplementation(async (filePath: any) => {
      const p = typeof filePath === 'string' ? filePath : filePath.toString();
      if (p.includes('index.json')) {
        return JSON.stringify({ executions: ['e1', 'e2', 'e3'] });
      }
      for (const exec of executions) {
        if (p.includes(exec.id)) {
          return JSON.stringify(exec);
        }
      }
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const asc = await storage.queryExecutions({
      sortBy: 'resilienceScore',
      sortDirection: 'asc',
      limit: 2,
    });
    expect(asc.executions.map(execution => execution.id)).toEqual(['e1', 'e3']);

    const desc = await storage.queryExecutions({
      sortBy: 'timestamp',
      sortDirection: 'desc',
      limit: 2,
    });
    expect(desc.executions.map(execution => execution.id)).toEqual(['e3', 'e2']);
  });

  // FS-015
  it('FS-015: createBatch generates ID, sets status=pending, writes to file', async () => {
    mockReadFileForPaths({});

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const batch = await storage.createBatch({
      name: 'Test Batch',
      testCaseIds: ['tc-1', 'tc-2'],
      modelConfigIds: ['model-1', 'model-2'],
      status: 'running' as any, // Should be overridden to 'pending'
      completedTests: 0,
      failedTests: 0,
      executionIds: [],
    });

    expect(batch.id).toMatch(/^batch-/);
    expect(batch.status).toBe('pending');
    expect(batch.createdAt).toBeDefined();
    expect(batch.totalTests).toBe(4); // 2 test cases * 2 models
    expect(batch.name).toBe('Test Batch');
    expect(batch.testCaseIds).toEqual(['tc-1', 'tc-2']);
    expect(batch.modelConfigIds).toEqual(['model-1', 'model-2']);

    // Should have written batch file and updated index
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  // FS-016
  it('FS-016: cleanup removes old executions and batches beyond retention', async () => {
    const oldDate = '2025-01-01T00:00:00.000Z';
    const recentDate = '2026-03-09T00:00:00.000Z';

    const executions = [
      makeExecution({ id: 'old-exec', timestamp: oldDate }),
      makeExecution({ id: 'new-exec', timestamp: recentDate }),
    ];

    mockFs.readFile.mockImplementation(async (filePath: any) => {
      const p = typeof filePath === 'string' ? filePath : filePath.toString();
      if (p.includes('executions') && p.includes('index.json')) {
        return JSON.stringify({ executions: ['old-exec', 'new-exec'] });
      }
      if (p.includes('batches') && p.includes('index.json')) {
        return JSON.stringify({ batches: ['old-batch', 'new-batch'] });
      }
      if (p.includes('old-exec')) return JSON.stringify(executions[0]);
      if (p.includes('new-exec')) return JSON.stringify(executions[1]);
      if (p.includes('old-batch')) {
        return JSON.stringify({ id: 'old-batch', createdAt: oldDate, status: 'completed' });
      }
      if (p.includes('new-batch')) {
        return JSON.stringify({ id: 'new-batch', createdAt: recentDate, status: 'pending' });
      }
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    });

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const result = await storage.cleanup(30); // 30-day retention

    // old-exec and old-batch are older than 30 days
    expect(result.executionsDeleted).toBeGreaterThanOrEqual(1);
    expect(result.batchesDeleted).toBeGreaterThanOrEqual(1);
  });

  // FS-017
  it('FS-017: healthCheck returns healthy=true when data dir is writable', async () => {
    mockFs.access.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 512 } as any);

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const health = await storage.healthCheck();

    expect(health.healthy).toBe(true);
    expect(health.errors).toHaveLength(0);
    expect(health.storageUsed).toBeGreaterThanOrEqual(0);
    expect(health.storageLimit).toBe(10 * 1024 * 1024 * 1024); // 10GB
  });

  // FS-018
  it('FS-018: healthCheck returns errors when data dir is not writable', async () => {
    mockFs.access.mockRejectedValue(new Error('EACCES: permission denied'));
    mockFs.stat.mockRejectedValue(new Error('stat failed'));

    const { FileStorage } = await import('../file-storage');
    const storage = new FileStorage();

    const health = await storage.healthCheck();

    expect(health.healthy).toBe(false);
    expect(health.errors.length).toBeGreaterThan(0);
    expect(health.errors.some(e => e.includes('not writable'))).toBe(true);
  });
});
