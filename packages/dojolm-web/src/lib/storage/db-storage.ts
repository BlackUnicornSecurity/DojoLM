/**
 * Database-backed storage implementation of IStorageBackend.
 *
 * Delegates to domain repositories and provides the same interface
 * as FileStorage for seamless backend switching.
 */

import type {
  IStorageBackend,
  StorageQueryOptions,
  ExecutionQuery,
  BatchQuery,
} from './storage-interface';
import type {
  LLMModelConfig,
  LLMPromptTestCase,
  LLMTestExecution,
  LLMBatchExecution,
} from '../llm-types';
import { getDatabase, initializeDatabase } from '../db';
import { modelConfigRepo } from '../db/repositories/model-config.repository';
import { testCaseRepo } from '../db/repositories/test-case.repository';
import { executionRepo } from '../db/repositories/execution.repository';
import { batchRepo } from '../db/repositories/batch.repository';
import type { ModelConfigRow, TestCaseRow, TestExecutionRow, BatchExecutionRow } from '../db/types';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// --- Type Converters ---

function modelConfigRowToType(row: ModelConfigRow): LLMModelConfig {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as LLMModelConfig['provider'],
    model: row.model,
    apiKey: undefined, // Never expose encrypted key via this path
    baseUrl: row.base_url ?? undefined,
    enabled: row.enabled === 1,
    maxTokens: row.max_tokens ?? undefined,
    organizationId: row.organization_id ?? undefined,
    projectId: row.project_id ?? undefined,
    customHeaders: row.custom_headers_json ? JSON.parse(row.custom_headers_json) : undefined,
    temperature: row.temperature ?? undefined,
    topP: row.top_p ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function modelConfigRowWithKeyToType(
  row: Omit<ModelConfigRow, 'api_key_encrypted'> & { api_key?: string },
): LLMModelConfig {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider as LLMModelConfig['provider'],
    model: row.model,
    apiKey: row.api_key,
    baseUrl: row.base_url ?? undefined,
    enabled: row.enabled === 1,
    maxTokens: row.max_tokens ?? undefined,
    organizationId: row.organization_id ?? undefined,
    projectId: row.project_id ?? undefined,
    customHeaders: row.custom_headers_json ? JSON.parse(row.custom_headers_json) : undefined,
    temperature: row.temperature ?? undefined,
    topP: row.top_p ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function modelConfigTypeToRow(config: LLMModelConfig): Partial<ModelConfigRow> & { api_key?: string } {
  return {
    id: config.id,
    name: config.name,
    provider: config.provider,
    model: config.model,
    api_key: config.apiKey,
    base_url: config.baseUrl ?? null,
    enabled: config.enabled !== false ? 1 : 0,
    max_tokens: config.maxTokens ?? null,
    organization_id: config.organizationId ?? null,
    project_id: config.projectId ?? null,
    custom_headers_json: config.customHeaders ? JSON.stringify(config.customHeaders) : null,
    temperature: config.temperature ?? null,
    top_p: config.topP ?? null,
  };
}

function testCaseRowToType(row: TestCaseRow): LLMPromptTestCase {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    prompt: row.prompt,
    expectedBehavior: row.expected_behavior ?? '',
    severity: row.severity as LLMPromptTestCase['severity'],
    scenario: (row.scenario ?? undefined) as LLMPromptTestCase['scenario'],
    owaspCategory: (row.owasp_category ?? undefined) as LLMPromptTestCase['owaspCategory'],
    tpiStory: (row.tpi_story ?? undefined) as LLMPromptTestCase['tpiStory'],
    tags: row.tags_json ? JSON.parse(row.tags_json) : undefined,
    enabled: row.enabled === 1,
  };
}

function executionRowToType(row: TestExecutionRow): LLMTestExecution {
  return {
    id: row.id,
    testCaseId: row.test_case_id ?? '',
    modelConfigId: row.model_config_id ?? '',
    timestamp: row.executed_at,
    status: row.status as LLMTestExecution['status'],
    prompt: row.prompt ?? '',
    response: row.response ?? undefined,
    error: row.error ?? undefined,
    duration_ms: row.duration_ms ?? 0,
    promptTokens: row.prompt_tokens ?? 0,
    completionTokens: row.completion_tokens ?? 0,
    totalTokens: row.total_tokens ?? 0,
    injectionSuccess: row.injection_success ?? 0,
    harmfulness: row.harmfulness ?? 0,
    resilienceScore: row.resilience_score ?? 0,
    contentHash: row.content_hash ?? '',
    cached: row.cached === 1,
    categoriesPassed: [],
    categoriesFailed: [],
    owaspCoverage: {},
    tpiCoverage: {},
  };
}

/**
 * Convert a batch row to domain type.
 * Accepts pre-fetched testCaseIds to avoid N+1 queries.
 */
function batchRowToType(row: BatchExecutionRow, testCaseIds?: string[]): LLMBatchExecution {
  return {
    id: row.id,
    name: row.name,
    status: row.status as LLMBatchExecution['status'],
    modelConfigIds: row.model_config_id ? [row.model_config_id] : [],
    testCaseIds: testCaseIds ?? [],
    totalTests: row.total_tests,
    completedTests: row.completed_tests,
    failedTests: row.failed_tests,
    avgResilienceScore: row.avg_resilience_score ?? undefined,
    createdAt: row.started_at ?? '',
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    executionIds: [],
  };
}

/**
 * Batch-fetch test case IDs for multiple batches in one query.
 */
function batchFetchTestCaseIds(batchIds: string[]): Map<string, string[]> {
  if (batchIds.length === 0) return new Map();
  const db = getDatabase();
  const placeholders = batchIds.map(() => '?').join(', ');
  const rows = db.prepare(
    `SELECT batch_id, test_case_id FROM batch_test_cases WHERE batch_id IN (${placeholders})`
  ).all(...batchIds) as { batch_id: string; test_case_id: string }[];

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const existing = map.get(row.batch_id) ?? [];
    existing.push(row.test_case_id);
    map.set(row.batch_id, existing);
  }
  return map;
}

export class DbStorage implements IStorageBackend {
  private initialized = false;

  private ensureInitialized(): void {
    if (!this.initialized) {
      initializeDatabase();
      this.initialized = true;
    }
  }

  // --- Model Config Operations ---

  async getModelConfigs(): Promise<LLMModelConfig[]> {
    this.ensureInitialized();
    return modelConfigRepo.listSafe().map((r) => modelConfigRowToType({ ...r, api_key_encrypted: null }));
  }

  async getModelConfig(id: string): Promise<LLMModelConfig | null> {
    this.ensureInitialized();
    const row = modelConfigRepo.findByIdWithKey(id);
    return row ? modelConfigRowWithKeyToType(row) : null;
  }

  async saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig> {
    this.ensureInitialized();
    const data = modelConfigTypeToRow(config);
    const saved = modelConfigRepo.save(data);
    const hydrated = modelConfigRepo.findByIdWithKey(saved.id);
    return hydrated ? modelConfigRowWithKeyToType(hydrated) : modelConfigRowToType(saved);
  }

  async deleteModelConfig(id: string): Promise<boolean> {
    this.ensureInitialized();
    return modelConfigRepo.delete(id);
  }

  async setModelConfigEnabled(id: string, enabled: boolean): Promise<boolean> {
    this.ensureInitialized();
    const result = modelConfigRepo.update(id, { enabled: enabled ? 1 : 0 } as Partial<ModelConfigRow>);
    return result !== null;
  }

  // --- Test Case Operations ---

  async getTestCases(options?: StorageQueryOptions): Promise<LLMPromptTestCase[]> {
    this.ensureInitialized();
    const where: Record<string, unknown> = {};
    if (options?.category) where.category = options.category;
    if (options?.owaspCategory) where.owasp_category = options.owaspCategory;
    if (options?.tpiStory) where.tpi_story = options.tpiStory;
    if (options?.enabled !== undefined) where.enabled = options.enabled ? 1 : 0;

    const rows = testCaseRepo.findAll({
      where,
      limit: options?.limit,
      offset: options?.offset,
      orderBy: options?.sortBy,
      orderDir: options?.sortDirection === 'desc' ? 'DESC' : 'ASC',
    });
    return rows.map(testCaseRowToType);
  }

  async getTestCase(id: string): Promise<LLMPromptTestCase | null> {
    this.ensureInitialized();
    const row = testCaseRepo.findById(id);
    return row ? testCaseRowToType(row) : null;
  }

  async saveTestCase(testCase: LLMPromptTestCase): Promise<LLMPromptTestCase> {
    this.ensureInitialized();
    const row: Partial<TestCaseRow> = {
      id: testCase.id,
      name: testCase.name,
      category: testCase.category,
      prompt: testCase.prompt,
      expected_behavior: testCase.expectedBehavior ?? null,
      severity: testCase.severity ?? 'MEDIUM',
      scenario: testCase.scenario ?? null,
      owasp_category: testCase.owaspCategory ?? null,
      tpi_story: testCase.tpiStory ?? null,
      tags_json: testCase.tags ? JSON.stringify(testCase.tags) : null,
      enabled: testCase.enabled !== false ? 1 : 0,
    };
    const existing = testCaseRepo.findById(testCase.id);
    const saved = existing ? testCaseRepo.update(testCase.id, row)! : testCaseRepo.create(row);
    return testCaseRowToType(saved);
  }

  async deleteTestCase(id: string): Promise<boolean> {
    this.ensureInitialized();
    return testCaseRepo.delete(id);
  }

  async importTestCases(testCases: LLMPromptTestCase[]): Promise<{ imported: number; failed: number }> {
    this.ensureInitialized();
    const rows = testCases.map((tc) => ({
      id: tc.id,
      name: tc.name,
      category: tc.category,
      prompt: tc.prompt,
      expected_behavior: tc.expectedBehavior ?? null,
      severity: tc.severity ?? 'MEDIUM',
      scenario: tc.scenario ?? null,
      owasp_category: tc.owaspCategory ?? null,
      tpi_story: tc.tpiStory ?? null,
      tags_json: tc.tags ? JSON.stringify(tc.tags) : null,
      enabled: tc.enabled !== false ? 1 : 0,
    }));
    const imported = testCaseRepo.bulkUpsert(rows);
    return { imported, failed: testCases.length - imported };
  }

  // --- Execution Operations ---

  async saveExecution(execution: LLMTestExecution): Promise<LLMTestExecution> {
    this.ensureInitialized();
    const row: Partial<TestExecutionRow> = {
      id: execution.id,
      test_case_id: execution.testCaseId,
      model_config_id: execution.modelConfigId,
      status: execution.status,
      prompt: execution.prompt,
      response: execution.response ?? null,
      error: execution.error ?? null,
      duration_ms: execution.duration_ms ?? null,
      prompt_tokens: execution.promptTokens ?? null,
      completion_tokens: execution.completionTokens ?? null,
      total_tokens: execution.totalTokens ?? null,
      injection_success: execution.injectionSuccess ?? null,
      harmfulness: execution.harmfulness ?? null,
      resilience_score: execution.resilienceScore ?? null,
      content_hash: execution.contentHash ?? null,
      cached: execution.cached ? 1 : 0,
      executed_at: execution.timestamp,
    };

    const owaspCoverage = execution.owaspCoverage
      ? Object.entries(execution.owaspCoverage).map(([category, passed]) => ({ category, passed: !!passed }))
      : undefined;
    const tpiCoverage = execution.tpiCoverage
      ? Object.entries(execution.tpiCoverage).map(([story, passed]) => ({ story, passed: !!passed }))
      : undefined;

    const saved = executionRepo.saveExecution(row, owaspCoverage, tpiCoverage);
    return executionRowToType(saved);
  }

  async getExecution(id: string): Promise<LLMTestExecution | null> {
    this.ensureInitialized();
    const row = executionRepo.findById(id);
    return row ? executionRowToType(row) : null;
  }

  async queryExecutions(query: ExecutionQuery): Promise<{ executions: LLMTestExecution[]; total: number }> {
    this.ensureInitialized();
    const result = executionRepo.queryExecutions(
      {
        modelId: query.modelConfigId,
        testCaseId: query.testCaseId,
        status: query.status,
        minScore: query.minScore,
        maxScore: query.maxScore,
        dateFrom: query.startDate,
        dateTo: query.endDate,
      },
      query.limit ?? 50,
      query.offset ?? 0
    );
    return {
      executions: result.data.map(executionRowToType),
      total: result.total,
    };
  }

  async getRecentExecutions(modelConfigId: string, limit: number = 10): Promise<LLMTestExecution[]> {
    this.ensureInitialized();
    const result = executionRepo.queryExecutions({ modelId: modelConfigId }, limit, 0);
    return result.data.map(executionRowToType);
  }

  async deleteExecution(id: string): Promise<boolean> {
    this.ensureInitialized();
    return executionRepo.delete(id);
  }

  async clearOldExecutions(retentionDays: number): Promise<number> {
    this.ensureInitialized();
    const db = getDatabase();
    const result = db.prepare(
      `DELETE FROM test_executions WHERE executed_at < datetime('now', ? || ' days')`
    ).run(`-${retentionDays}`);
    return result.changes;
  }

  // --- Batch Operations ---

  async createBatch(batch: Omit<LLMBatchExecution, 'id' | 'createdAt' | 'totalTests'>): Promise<LLMBatchExecution> {
    this.ensureInitialized();
    const id = crypto.randomUUID();
    const row: Partial<BatchExecutionRow> = {
      id,
      name: batch.name,
      model_config_id: batch.modelConfigIds?.[0] ?? null,
      status: batch.status ?? 'pending',
      total_tests: batch.testCaseIds?.length ?? 0,
      completed_tests: 0,
      passed_tests: 0,
      failed_tests: 0,
      started_at: new Date().toISOString(),
    };
    const tcIds = batch.testCaseIds ?? [];
    const created = batchRepo.createBatch(row, tcIds);
    return batchRowToType(created, tcIds);
  }

  async getBatch(id: string): Promise<LLMBatchExecution | null> {
    this.ensureInitialized();
    const row = batchRepo.findById(id);
    if (!row) return null;
    const tcIds = batchRepo.getTestCaseIds(id);
    return batchRowToType(row, tcIds);
  }

  async updateBatch(id: string, updates: Partial<Pick<LLMBatchExecution, 'status' | 'completedTests' | 'failedTests' | 'avgResilienceScore' | 'error'>>): Promise<LLMBatchExecution | null> {
    this.ensureInitialized();
    const partial: Partial<BatchExecutionRow> = {};
    if (updates.status) partial.status = updates.status;
    if (updates.completedTests !== undefined) partial.completed_tests = updates.completedTests;
    if (updates.failedTests !== undefined) partial.failed_tests = updates.failedTests;
    if (updates.avgResilienceScore !== undefined) partial.avg_resilience_score = updates.avgResilienceScore;
    batchRepo.update(id, partial);
    const row = batchRepo.findById(id);
    if (!row) return null;
    const tcIds = batchRepo.getTestCaseIds(id);
    return batchRowToType(row, tcIds);
  }

  async queryBatches(query: BatchQuery): Promise<{ batches: LLMBatchExecution[]; total: number }> {
    this.ensureInitialized();
    const result = batchRepo.queryBatches(
      { modelId: query.modelConfigIds?.[0], status: query.status, dateFrom: query.startDate, dateTo: query.endDate },
      query.limit ?? 50,
      query.offset ?? 0
    );
    // Batch-fetch test case IDs to avoid N+1 queries
    const batchIds = result.data.map((b) => b.id);
    const tcMap = batchFetchTestCaseIds(batchIds);
    return {
      batches: result.data.map((b) => batchRowToType(b, tcMap.get(b.id) ?? [])),
      total: result.total,
    };
  }

  async getBatchExecutions(batchId: string): Promise<LLMTestExecution[]> {
    this.ensureInitialized();
    const result = executionRepo.queryExecutions({ batchId }, 1000, 0);
    return result.data.map(executionRowToType);
  }

  async deleteBatch(id: string): Promise<boolean> {
    this.ensureInitialized();
    return batchRepo.delete(id);
  }

  // --- Statistics ---

  async getModelStats(modelConfigId: string): Promise<{
    totalExecutions: number;
    avgResilienceScore: number;
    injectionSuccessRate: number;
    harmfulnessRate: number;
    lastExecutionAt: string | null;
  }> {
    this.ensureInitialized();
    const stats = executionRepo.getStats(modelConfigId);
    const db = getDatabase();
    const lastExec = db.prepare(
      'SELECT MAX(executed_at) as last FROM test_executions WHERE model_config_id = ?'
    ).get(modelConfigId) as { last: string | null };

    return {
      totalExecutions: stats.totalTests,
      avgResilienceScore: stats.avgResilienceScore,
      injectionSuccessRate: stats.avgInjectionSuccess,
      harmfulnessRate: stats.avgHarmfulness,
      lastExecutionAt: lastExec.last,
    };
  }

  async getSystemStats(): Promise<{
    totalModels: number;
    totalTestCases: number;
    totalExecutions: number;
    totalBatches: number;
    avgResilienceScore: number;
  }> {
    this.ensureInitialized();
    const db = getDatabase();
    const stats = db.prepare(
      `SELECT
        (SELECT COUNT(*) FROM model_configs) as total_models,
        (SELECT COUNT(*) FROM test_cases) as total_test_cases,
        (SELECT COUNT(*) FROM test_executions) as total_executions,
        (SELECT COUNT(*) FROM batch_executions) as total_batches,
        (SELECT AVG(resilience_score) FROM test_executions WHERE status = 'completed') as avg_score`
    ).get() as Record<string, number | null>;

    return {
      totalModels: stats.total_models ?? 0,
      totalTestCases: stats.total_test_cases ?? 0,
      totalExecutions: stats.total_executions ?? 0,
      totalBatches: stats.total_batches ?? 0,
      avgResilienceScore: stats.avg_score ?? 0,
    };
  }

  // --- Maintenance ---

  async cleanup(retentionDays: number): Promise<{ executionsDeleted: number; batchesDeleted: number }> {
    this.ensureInitialized();
    const db = getDatabase();
    const execResult = db.prepare(
      `DELETE FROM test_executions WHERE executed_at < datetime('now', ? || ' days')`
    ).run(`-${retentionDays}`);
    const batchResult = db.prepare(
      `DELETE FROM batch_executions WHERE completed_at < datetime('now', ? || ' days') AND status IN ('completed', 'failed', 'cancelled')`
    ).run(`-${retentionDays}`);
    return { executionsDeleted: execResult.changes, batchesDeleted: batchResult.changes };
  }

  async healthCheck(): Promise<{ healthy: boolean; storageUsed: number; storageLimit: number; errors: string[] }> {
    this.ensureInitialized();
    const errors: string[] = [];
    let storageUsed = 0;

    try {
      const db = getDatabase();
      db.prepare('SELECT 1').get(); // Simple connectivity check
      const dbPath = path.join(process.cwd(), 'data', 'tpi.db');
      if (fs.existsSync(dbPath)) {
        storageUsed = fs.statSync(dbPath).size;
      }
    } catch (err) {
      errors.push(`Database error: ${(err as Error).message}`);
    }

    return {
      healthy: errors.length === 0,
      storageUsed,
      storageLimit: 1024 * 1024 * 1024, // 1GB soft limit
      errors,
    };
  }
}

export const dbStorage = new DbStorage();
