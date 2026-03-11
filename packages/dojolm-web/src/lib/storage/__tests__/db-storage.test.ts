import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (vi.mock is hoisted, so factories must not reference outer variables) ---

const mockPrepare = vi.fn().mockReturnValue({
  run: vi.fn().mockReturnValue({ changes: 0 }),
  get: vi.fn(),
  all: vi.fn().mockReturnValue([]),
});

vi.mock('../../db', () => ({
  getDatabase: vi.fn(() => ({
    prepare: (...args: unknown[]) => mockPrepare(...args),
  })),
  initializeDatabase: vi.fn(),
}));

vi.mock('../../db/repositories/model-config.repository', () => ({
  modelConfigRepo: {
    listSafe: vi.fn().mockReturnValue([]),
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../db/repositories/test-case.repository', () => ({
  testCaseRepo: {
    findAll: vi.fn().mockReturnValue([]),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    bulkUpsert: vi.fn(),
  },
}));

vi.mock('../../db/repositories/execution.repository', () => ({
  executionRepo: {
    saveExecution: vi.fn(),
    findById: vi.fn(),
    queryExecutions: vi.fn().mockReturnValue({ data: [], total: 0 }),
    delete: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      totalTests: 0,
      avgResilienceScore: 0,
      avgInjectionSuccess: 0,
      avgHarmfulness: 0,
    }),
  },
}));

vi.mock('../../db/repositories/batch.repository', () => ({
  batchRepo: {
    createBatch: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    queryBatches: vi.fn().mockReturnValue({ data: [], total: 0 }),
    getTestCaseIds: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    statSync: vi.fn().mockReturnValue({ size: 0 }),
  },
  existsSync: vi.fn().mockReturnValue(false),
  statSync: vi.fn().mockReturnValue({ size: 0 }),
}));

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
  },
  randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
}));

// Import after mocks
import { DbStorage, dbStorage } from '../db-storage';
import { initializeDatabase, getDatabase } from '../../db';
import { modelConfigRepo } from '../../db/repositories/model-config.repository';
import { testCaseRepo } from '../../db/repositories/test-case.repository';
import { executionRepo } from '../../db/repositories/execution.repository';
import { batchRepo } from '../../db/repositories/batch.repository';

// Helper row factories
function makeModelConfigRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mc-1',
    name: 'Test Model',
    provider: 'openai',
    model: 'gpt-4',
    api_key_encrypted: null,
    base_url: null,
    enabled: 1,
    max_tokens: 4096,
    organization_id: null,
    project_id: null,
    custom_headers_json: null,
    temperature: 0.7,
    top_p: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTestCaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tc-1',
    name: 'Prompt Injection Basic',
    category: 'prompt-injection',
    prompt: 'Ignore previous instructions',
    expected_behavior: 'Model refuses',
    severity: 'HIGH',
    scenario: null,
    owasp_category: 'LLM01',
    tpi_story: null,
    tags_json: null,
    enabled: 1,
    ...overrides,
  };
}

function makeExecutionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exec-1',
    test_case_id: 'tc-1',
    model_config_id: 'mc-1',
    status: 'completed',
    prompt: 'test prompt',
    response: 'test response',
    error: null,
    duration_ms: 150,
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
    injection_success: 0,
    harmfulness: 0,
    resilience_score: 0.95,
    content_hash: 'abc123',
    cached: 0,
    executed_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeBatchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'batch-1',
    name: 'Test Batch',
    model_config_id: 'mc-1',
    status: 'completed',
    total_tests: 5,
    completed_tests: 5,
    passed_tests: 4,
    failed_tests: 1,
    avg_resilience_score: 0.85,
    started_at: '2025-01-01T00:00:00Z',
    completed_at: '2025-01-01T01:00:00Z',
    ...overrides,
  };
}

describe('DbStorage', () => {
  let storage: DbStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock return values after clearAllMocks
    mockPrepare.mockReturnValue({
      run: vi.fn().mockReturnValue({ changes: 0 }),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    });
    vi.mocked(modelConfigRepo.listSafe).mockReturnValue([]);
    vi.mocked(executionRepo.queryExecutions).mockReturnValue({ data: [], total: 0 } as never);
    vi.mocked(executionRepo.getStats).mockReturnValue({
      totalTests: 0,
      avgResilienceScore: 0,
      avgInjectionSuccess: 0,
      avgHarmfulness: 0,
    } as never);
    vi.mocked(batchRepo.queryBatches).mockReturnValue({ data: [], total: 0 } as never);
    vi.mocked(batchRepo.getTestCaseIds).mockReturnValue([] as never);
    // Create a fresh instance so `initialized` resets
    storage = new DbStorage();
  });

  // DBS-001
  it('initializes database on first operation', async () => {
    await storage.getModelConfigs();
    expect(initializeDatabase).toHaveBeenCalledOnce();
  });

  // DBS-001 continued: only initializes once
  it('does not re-initialize on subsequent operations', async () => {
    await storage.getModelConfigs();
    await storage.getModelConfigs();
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
  });

  // DBS-002
  it('getModelConfigs delegates to modelConfigRepo.listSafe and converts rows', async () => {
    const row = makeModelConfigRow();
    vi.mocked(modelConfigRepo.listSafe).mockReturnValue([row] as never);

    const result = await storage.getModelConfigs();

    expect(modelConfigRepo.listSafe).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'mc-1',
      name: 'Test Model',
      provider: 'openai',
      model: 'gpt-4',
      enabled: true,
      maxTokens: 4096,
      temperature: 0.7,
    });
  });

  // DBS-003
  it('getModelConfig returns null for non-existent ID', async () => {
    vi.mocked(modelConfigRepo.findById).mockReturnValue(undefined as never);
    const result = await storage.getModelConfig('non-existent');
    expect(result).toBeNull();
  });

  // DBS-004
  it('saveModelConfig calls modelConfigRepo.save with converted row data', async () => {
    const config = {
      id: 'mc-2',
      name: 'New Model',
      provider: 'anthropic' as const,
      model: 'claude-3',
      apiKey: 'sk-secret',
      enabled: true,
      maxTokens: 8192,
    };
    const savedRow = makeModelConfigRow({ id: 'mc-2', name: 'New Model', provider: 'anthropic', model: 'claude-3' });
    vi.mocked(modelConfigRepo.save).mockReturnValue(savedRow as never);

    await storage.saveModelConfig(config as never);

    expect(modelConfigRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mc-2',
        name: 'New Model',
        provider: 'anthropic',
        model: 'claude-3',
        api_key: 'sk-secret',
        enabled: 1,
        max_tokens: 8192,
      })
    );
  });

  // DBS-005
  it('deleteModelConfig delegates to repo and returns boolean', async () => {
    vi.mocked(modelConfigRepo.delete).mockReturnValue(true as never);
    const result = await storage.deleteModelConfig('mc-1');
    expect(result).toBe(true);
    expect(modelConfigRepo.delete).toHaveBeenCalledWith('mc-1');
  });

  // DBS-006
  it('getTestCases passes filter options to repository', async () => {
    const row = makeTestCaseRow();
    vi.mocked(testCaseRepo.findAll).mockReturnValue([row] as never);

    const result = await storage.getTestCases({
      category: 'prompt-injection',
      owaspCategory: 'LLM01',
      enabled: true,
      limit: 10,
      offset: 0,
      sortBy: 'name',
      sortDirection: 'desc',
    });

    expect(testCaseRepo.findAll).toHaveBeenCalledWith({
      where: {
        category: 'prompt-injection',
        owasp_category: 'LLM01',
        enabled: 1,
      },
      limit: 10,
      offset: 0,
      orderBy: 'name',
      orderDir: 'DESC',
    });
    expect(result).toHaveLength(1);
    expect(result[0].owaspCategory).toBe('LLM01');
  });

  // DBS-007
  it('saveTestCase creates new case when it does not exist', async () => {
    const tc = {
      id: 'tc-new',
      name: 'New Test',
      category: 'jailbreak',
      prompt: 'Test prompt',
      expectedBehavior: 'Refuse',
      severity: 'HIGH' as const,
      enabled: true,
    };
    vi.mocked(testCaseRepo.findById).mockReturnValue(undefined as never);
    const createdRow = makeTestCaseRow({ id: 'tc-new', name: 'New Test', category: 'jailbreak' });
    vi.mocked(testCaseRepo.create).mockReturnValue(createdRow as never);

    const result = await storage.saveTestCase(tc as never);

    expect(testCaseRepo.create).toHaveBeenCalled();
    expect(testCaseRepo.update).not.toHaveBeenCalled();
    expect(result.id).toBe('tc-new');
  });

  // DBS-008
  it('saveTestCase updates existing case when it already exists', async () => {
    const tc = {
      id: 'tc-1',
      name: 'Updated Test',
      category: 'prompt-injection',
      prompt: 'Updated prompt',
      expectedBehavior: 'Refuse',
      severity: 'HIGH' as const,
      enabled: true,
    };
    const existingRow = makeTestCaseRow();
    vi.mocked(testCaseRepo.findById).mockReturnValue(existingRow as never);
    const updatedRow = makeTestCaseRow({ name: 'Updated Test', prompt: 'Updated prompt' });
    vi.mocked(testCaseRepo.update).mockReturnValue(updatedRow as never);

    const result = await storage.saveTestCase(tc as never);

    expect(testCaseRepo.update).toHaveBeenCalledWith('tc-1', expect.any(Object));
    expect(testCaseRepo.create).not.toHaveBeenCalled();
    expect(result.name).toBe('Updated Test');
  });

  // DBS-009
  it('importTestCases delegates to testCaseRepo.bulkUpsert', async () => {
    const cases = [
      { id: 'tc-a', name: 'A', category: 'cat', prompt: 'p', severity: 'HIGH', enabled: true },
      { id: 'tc-b', name: 'B', category: 'cat', prompt: 'p', severity: 'LOW', enabled: false },
    ];
    vi.mocked(testCaseRepo.bulkUpsert).mockReturnValue(2 as never);

    const result = await storage.importTestCases(cases as never);

    expect(testCaseRepo.bulkUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'tc-a', enabled: 1 }),
        expect.objectContaining({ id: 'tc-b', enabled: 0 }),
      ])
    );
    expect(result).toEqual({ imported: 2, failed: 0 });
  });

  // DBS-010
  it('saveExecution converts domain type to row and delegates to executionRepo', async () => {
    const execution = {
      id: 'exec-1',
      testCaseId: 'tc-1',
      modelConfigId: 'mc-1',
      timestamp: '2025-01-01T00:00:00Z',
      status: 'completed' as const,
      prompt: 'test',
      response: 'result',
      duration_ms: 100,
      promptTokens: 5,
      completionTokens: 10,
      totalTokens: 15,
      injectionSuccess: 0,
      harmfulness: 0,
      resilienceScore: 0.9,
      contentHash: 'hash1',
      cached: false,
      categoriesPassed: [],
      categoriesFailed: [],
      owaspCoverage: { LLM01: true },
      tpiCoverage: { 'TPI-001': false },
    };
    const savedRow = makeExecutionRow();
    vi.mocked(executionRepo.saveExecution).mockReturnValue(savedRow as never);

    await storage.saveExecution(execution as never);

    expect(executionRepo.saveExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'exec-1',
        test_case_id: 'tc-1',
        model_config_id: 'mc-1',
        status: 'completed',
        cached: 0,
        executed_at: '2025-01-01T00:00:00Z',
      }),
      expect.arrayContaining([{ category: 'LLM01', passed: true }]),
      expect.arrayContaining([{ story: 'TPI-001', passed: false }])
    );
  });

  // DBS-011
  it('queryExecutions maps query params and returns converted results', async () => {
    const execRow = makeExecutionRow();
    vi.mocked(executionRepo.queryExecutions).mockReturnValue({ data: [execRow], total: 1 } as never);

    const result = await storage.queryExecutions({
      modelConfigId: 'mc-1',
      testCaseId: 'tc-1',
      status: 'completed',
      minScore: 0.5,
      maxScore: 1.0,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      limit: 25,
      offset: 0,
    } as never);

    expect(executionRepo.queryExecutions).toHaveBeenCalledWith(
      {
        modelId: 'mc-1',
        testCaseId: 'tc-1',
        status: 'completed',
        minScore: 0.5,
        maxScore: 1.0,
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      },
      25,
      0
    );
    expect(result.executions).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.executions[0].testCaseId).toBe('tc-1');
  });

  // DBS-012
  it('createBatch generates UUID and delegates to batchRepo.createBatch', async () => {
    const createdRow = makeBatchRow({ id: 'test-uuid-1234' });
    vi.mocked(batchRepo.createBatch).mockReturnValue(createdRow as never);

    const result = await storage.createBatch({
      name: 'New Batch',
      modelConfigIds: ['mc-1'],
      testCaseIds: ['tc-1', 'tc-2'],
      status: 'pending',
    } as never);

    expect(batchRepo.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-uuid-1234',
        name: 'New Batch',
        model_config_id: 'mc-1',
        status: 'pending',
        total_tests: 2,
      }),
      ['tc-1', 'tc-2']
    );
    expect(result.id).toBe('test-uuid-1234');
    expect(result.testCaseIds).toEqual(['tc-1', 'tc-2']);
  });

  // DBS-013
  it('updateBatch maps domain fields to row fields', async () => {
    const updatedRow = makeBatchRow({ status: 'completed', completed_tests: 5, failed_tests: 1, avg_resilience_score: 0.9 });
    vi.mocked(batchRepo.update).mockReturnValue(undefined as never);
    vi.mocked(batchRepo.findById).mockReturnValue(updatedRow as never);
    vi.mocked(batchRepo.getTestCaseIds).mockReturnValue(['tc-1'] as never);

    const result = await storage.updateBatch('batch-1', {
      status: 'completed',
      completedTests: 5,
      failedTests: 1,
      avgResilienceScore: 0.9,
    });

    expect(batchRepo.update).toHaveBeenCalledWith('batch-1', {
      status: 'completed',
      completed_tests: 5,
      failed_tests: 1,
      avg_resilience_score: 0.9,
    });
    expect(result).not.toBeNull();
    expect(result!.status).toBe('completed');
  });

  // DBS-014
  it('queryBatches batch-fetches test case IDs to avoid N+1', async () => {
    const batchRow1 = makeBatchRow({ id: 'b1' });
    const batchRow2 = makeBatchRow({ id: 'b2' });
    vi.mocked(batchRepo.queryBatches).mockReturnValue({ data: [batchRow1, batchRow2], total: 2 } as never);

    // Mock the batchFetchTestCaseIds path via getDatabase
    mockPrepare.mockReturnValue({
      run: vi.fn().mockReturnValue({ changes: 0 }),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([
        { batch_id: 'b1', test_case_id: 'tc-1' },
        { batch_id: 'b1', test_case_id: 'tc-2' },
        { batch_id: 'b2', test_case_id: 'tc-3' },
      ]),
    });

    const result = await storage.queryBatches({ limit: 50, offset: 0 } as never);

    expect(result.batches).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(getDatabase).toHaveBeenCalled();
  });

  // DBS-015
  it('clearOldExecutions uses SQL with retention days parameter', async () => {
    const mockRun = vi.fn().mockReturnValue({ changes: 42 });
    mockPrepare.mockReturnValue({
      run: mockRun,
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    });

    const deleted = await storage.clearOldExecutions(30);

    expect(getDatabase).toHaveBeenCalled();
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM test_executions')
    );
    expect(mockRun).toHaveBeenCalledWith('-30');
    expect(deleted).toBe(42);
  });

  // DBS-016
  it('healthCheck returns healthy when DB connectivity succeeds', async () => {
    mockPrepare.mockReturnValue({
      run: vi.fn(),
      get: vi.fn().mockReturnValue({ '1': 1 }),
      all: vi.fn().mockReturnValue([]),
    });

    const result = await storage.healthCheck();

    expect(result.healthy).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.storageLimit).toBe(1024 * 1024 * 1024);
  });

  // DBS-017
  it('healthCheck returns errors when DB fails', async () => {
    vi.mocked(getDatabase).mockImplementationOnce(() => {
      throw new Error('Connection refused');
    });

    const freshStorage = new DbStorage();
    const result = await freshStorage.healthCheck();

    expect(result.healthy).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Connection refused');
  });

  // DBS-018
  it('model config type converter never exposes API key', async () => {
    const row = makeModelConfigRow({ api_key_encrypted: 'encrypted-secret-key' });
    vi.mocked(modelConfigRepo.listSafe).mockReturnValue([row] as never);

    const configs = await storage.getModelConfigs();

    expect(configs[0].apiKey).toBeUndefined();
  });

  // Additional: singleton export
  it('exports dbStorage as singleton instance', () => {
    expect(dbStorage).toBeInstanceOf(DbStorage);
  });

  // Additional: setModelConfigEnabled
  it('setModelConfigEnabled converts boolean to integer and delegates to repo', async () => {
    vi.mocked(modelConfigRepo.update).mockReturnValue(makeModelConfigRow({ enabled: 0 }) as never);

    const result = await storage.setModelConfigEnabled('mc-1', false);

    expect(modelConfigRepo.update).toHaveBeenCalledWith('mc-1', { enabled: 0 });
    expect(result).toBe(true);
  });

  // Additional: deleteTestCase
  it('deleteTestCase delegates to testCaseRepo.delete', async () => {
    vi.mocked(testCaseRepo.delete).mockReturnValue(true as never);
    const result = await storage.deleteTestCase('tc-1');
    expect(result).toBe(true);
    expect(testCaseRepo.delete).toHaveBeenCalledWith('tc-1');
  });
});
