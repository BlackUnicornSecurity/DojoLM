/**
 * File: file-storage.ts
 * Purpose: File-based implementation of IStorageBackend
 * Index:
 * - FileStorage class (line 28)
 * - Path constants (line 54)
 * - JSON read/write utilities (line 73)
 * - Content hashing (line 103)
 * - Model config operations (line 128)
 * - Test case operations (line 217)
 * - Execution operations (line 330)
 * - Batch operations (line 470)
 * - Statistics (line 580)
 * - Maintenance (line 630)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

import type {
  LLMModelConfig,
  LLMPromptTestCase,
  LLMTestExecution,
  LLMBatchExecution,
} from '../llm-types';

import type {
  IStorageBackend,
  StorageQueryOptions,
  ExecutionQuery,
  BatchQuery,
} from './storage-interface';
import { decrypt, encrypt } from '../db/encryption';
import { getDataPath } from '@/lib/runtime-paths';

// ===========================================================================
// Path Constants
// ===========================================================================

/**
 * Base directory for LLM data storage
 */
const DATA_BASE_DIR = getDataPath('llm-results');

/**
 * File paths for different data types
 */
const PATHS = {
  models: path.join(DATA_BASE_DIR, 'models.json'),
  testCases: path.join(DATA_BASE_DIR, 'test-cases.json'),
  executionsIndex: path.join(DATA_BASE_DIR, 'executions', 'index.json'),
  batchesIndex: path.join(DATA_BASE_DIR, 'batches', 'index.json'),
  batches: path.join(DATA_BASE_DIR, 'batches'),
  modelsResults: path.join(DATA_BASE_DIR, 'models'),
} as const;

/**
 * Validate storage IDs to prevent path traversal (CR-1)
 */
function isValidStorageId(id: string): boolean {
  return /^[\w.-]+$/.test(id) && !id.includes('..');
}

function safeFilePath(baseDir: string, id: string, ext: string = '.json'): string {
  if (!isValidStorageId(id)) {
    throw new Error(`Invalid storage ID: contains unsafe characters`);
  }
  const resolved = path.resolve(baseDir, `${id}${ext}`);
  const resolvedBase = path.resolve(baseDir);
  if (!resolved.startsWith(resolvedBase + path.sep)) {
    throw new Error(`Invalid storage ID: path traversal detected`);
  }
  return resolved;
}

/**
 * Get the file path for a batch's JSON data
 */
export function getBatchFilePath(batchId: string): string {
  return safeFilePath(PATHS.batches, batchId);
}

/**
 * Get the file path for a model's results summary
 */
export function getModelSummaryPath(modelId: string): string {
  return safeFilePath(PATHS.modelsResults, modelId);
}

// ===========================================================================
// JSON Utilities
// ===========================================================================

/**
 * Safely read a JSON file
 */
async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Error reading ${filePath}:`, error);
    }
    return null;
  }
}

/**
 * Safely write a JSON file with atomics
 */
async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);

  // Ensure directory exists - handle EEXIST race condition
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Ignore EEXIST - directory might have been created by another process
    const errno = error as NodeJS.ErrnoException;
    if (errno.code !== 'EEXIST') {
      throw error;
    }
  }

  // Write atomically — unique temp file to prevent race conditions (F-10)
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

// ===========================================================================
// File-Level Async Mutex (LOGIC-06 fix: prevents lost updates on shared JSON)
// ===========================================================================

/**
 * Per-file async mutex to prevent concurrent read-modify-write lost updates.
 * Atomic writes (temp+rename) prevent corruption, but without a lock two
 * concurrent reads can lead to one overwriting the other's changes.
 */
const fileLocks = new Map<string, Promise<void>>();
const FILE_LOCK_MAP_CAP = 200;

async function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const key = path.resolve(filePath);

  // Wait for any existing lock on this file
  while (fileLocks.has(key)) {
    await fileLocks.get(key);
  }

  // Cap lock map size (evict oldest by iteration order)
  if (fileLocks.size >= FILE_LOCK_MAP_CAP) {
    const firstKey = fileLocks.keys().next().value;
    if (firstKey) fileLocks.delete(firstKey);
  }

  // Create and register our lock
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => { releaseLock = resolve; });
  fileLocks.set(key, lockPromise);

  try {
    return await fn();
  } finally {
    fileLocks.delete(key);
    releaseLock!();
  }
}

// ===========================================================================
// Content Hashing
// ===========================================================================

/**
 * Generate SHA-256 hash of content for deduplication
 */
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate hash from prompt and model config for deduplication
 */
export function generateExecutionHash(prompt: string, modelConfigId: string): string {
  return generateContentHash(`${modelConfigId}:${prompt}`);
}

type StoredModelConfig = Omit<LLMModelConfig, 'apiKey' | 'customHeaders'> & {
  apiKey?: string;
  customHeaders?: Record<string, string>;
  apiKeyEncrypted?: string;
  customHeadersEncrypted?: string;
};

function encryptModelSecret(secret: string, fieldName: string): string {
  try {
    return encrypt(secret);
  } catch {
    throw new Error(`TPI_DB_ENCRYPTION_KEY is required to store model ${fieldName} securely`);
  }
}

function decryptModelSecret<T>(
  secret: string,
  fieldName: string,
  parser: (value: string) => T,
): T | undefined {
  try {
    return parser(decrypt(secret));
  } catch (error) {
    console.error(`Failed to decrypt stored model ${fieldName}:`, error);
    return undefined;
  }
}

function deserializeModelConfig(config: StoredModelConfig): LLMModelConfig {
  const {
    apiKeyEncrypted,
    customHeadersEncrypted,
    apiKey: legacyApiKey,
    customHeaders: legacyCustomHeaders,
    ...rest
  } = config;

  const apiKey = apiKeyEncrypted
    ? decryptModelSecret(apiKeyEncrypted, 'apiKey', (value) => value)
    : legacyApiKey;
  const customHeaders = customHeadersEncrypted
    ? decryptModelSecret(customHeadersEncrypted, 'customHeaders', (value) => JSON.parse(value) as Record<string, string>)
    : legacyCustomHeaders;

  return {
    ...rest,
    apiKey,
    customHeaders,
  };
}

function serializeModelConfig(config: LLMModelConfig): StoredModelConfig {
  const stored: StoredModelConfig = {
    ...config,
  };

  if (config.apiKey) {
    stored.apiKeyEncrypted = encryptModelSecret(config.apiKey, 'apiKey');
    delete (stored as Partial<StoredModelConfig>).apiKey;
  } else {
    delete (stored as Partial<StoredModelConfig>).apiKey;
    delete (stored as Partial<StoredModelConfig>).apiKeyEncrypted;
  }

  if (config.customHeaders && Object.keys(config.customHeaders).length > 0) {
    stored.customHeadersEncrypted = encryptModelSecret(
      JSON.stringify(config.customHeaders),
      'customHeaders'
    );
    delete (stored as Partial<StoredModelConfig>).customHeaders;
  } else {
    delete (stored as Partial<StoredModelConfig>).customHeaders;
    delete (stored as Partial<StoredModelConfig>).customHeadersEncrypted;
  }

  return stored;
}

// ===========================================================================
// File Storage Implementation
// ===========================================================================

export class FileStorage implements IStorageBackend {
  // -----------------------------------------------------------------------
  // Model Config Operations
  // -----------------------------------------------------------------------

  async getModelConfigs(): Promise<LLMModelConfig[]> {
    const data = await readJSON<StoredModelConfig[]>(PATHS.models);
    return (data || []).map(deserializeModelConfig);
  }

  async getModelConfig(id: string): Promise<LLMModelConfig | null> {
    const configs = await this.getModelConfigs();
    return configs.find(c => c.id === id) || null;
  }

  async saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig> {
    return withFileLock(PATHS.models, async () => {
      const configs = await this.getModelConfigs();
      const index = configs.findIndex(c => c.id === config.id);

      const now = new Date().toISOString();
      const updatedConfig: LLMModelConfig = {
        ...config,
        updatedAt: now,
      };

      if (index >= 0) {
        configs[index] = updatedConfig;
      } else {
        updatedConfig.createdAt = now;
        configs.push(updatedConfig);
      }

      await writeJSON(PATHS.models, configs.map(serializeModelConfig));

      return updatedConfig;
    });
  }

  async deleteModelConfig(id: string): Promise<boolean> {
    return withFileLock(PATHS.models, async () => {
      const configs = await this.getModelConfigs();
      const filtered = configs.filter(c => c.id !== id);

      if (filtered.length === configs.length) {
        return false; // Not found
      }

      await writeJSON(PATHS.models, filtered.map(serializeModelConfig));

      return true;
    });
  }

  async setModelConfigEnabled(id: string, enabled: boolean): Promise<boolean> {
    const config = await this.getModelConfig(id);
    if (!config) {
      return false;
    }

    await this.saveModelConfig({ ...config, enabled });
    return true;
  }

  // -----------------------------------------------------------------------
  // Test Case Operations
  // -----------------------------------------------------------------------

  async getTestCases(options?: StorageQueryOptions): Promise<LLMPromptTestCase[]> {
    const data = await readJSON<LLMPromptTestCase[]>(PATHS.testCases);
    let cases = data || [];

    // Apply filters
    if (options?.category) {
      cases = cases.filter(c => c.category === options.category);
    }
    if (options?.owaspCategory) {
      cases = cases.filter(c => c.owaspCategory === options.owaspCategory);
    }
    if (options?.tpiStory) {
      cases = cases.filter(c => c.tpiStory === options.tpiStory);
    }
    if (options?.enabled !== undefined) {
      cases = cases.filter(c => c.enabled === options.enabled);
    }
    if (options?.tags?.length) {
      cases = cases.filter(c =>
        options.tags!.some(tag => c.tags?.includes(tag))
      );
    }

    // Sorting
    if (options?.sortBy && options.sortBy !== undefined) {
      const sortBy = options.sortBy;
      cases.sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sortBy];
        const bVal = (b as unknown as Record<string, unknown>)[sortBy];
        const aResult = aVal === undefined ? null : aVal;
        const bResult = bVal === undefined ? null : bVal;

        if (aResult === null) return 1;
        if (bResult === null) return -1;
        if (options.sortDirection === 'desc') {
          return bResult > aResult ? 1 : -1;
        }
        return aResult > bResult ? 1 : -1;
      });
    }

    // Pagination
    if (options?.limit !== undefined) {
      const offset = options.offset || 0;
      cases = cases.slice(offset, offset + options.limit);
    }

    return cases;
  }

  async getTestCase(id: string): Promise<LLMPromptTestCase | null> {
    const cases = await this.getTestCases();
    return cases.find(c => c.id === id) || null;
  }

  async saveTestCase(testCase: LLMPromptTestCase): Promise<LLMPromptTestCase> {
    return withFileLock(PATHS.testCases, async () => {
      const cases = await this.getTestCases();
      const index = cases.findIndex(c => c.id === testCase.id);

      if (index >= 0) {
        cases[index] = testCase;
      } else {
        cases.push(testCase);
      }

      await writeJSON(PATHS.testCases, cases);

      return testCase;
    });
  }

  async deleteTestCase(id: string): Promise<boolean> {
    return withFileLock(PATHS.testCases, async () => {
      const cases = await this.getTestCases();
      const filtered = cases.filter(c => c.id !== id);

      if (filtered.length === cases.length) {
        return false;
      }

      await writeJSON(PATHS.testCases, filtered);

      return true;
    });
  }

  async importTestCases(testCases: LLMPromptTestCase[]): Promise<{ imported: number; failed: number }> {
    return withFileLock(PATHS.testCases, async () => {
      let imported = 0;
      let failed = 0;

      const existingCases = await this.getTestCases();
      const existingIds = new Set(existingCases.map(c => c.id));

      for (const testCase of testCases) {
        if (existingIds.has(testCase.id)) {
          failed++;
          continue;
        }
        existingCases.push(testCase);
        existingIds.add(testCase.id);
        imported++;
      }

      // Single bulk write — avoids nested lock and N individual writes
      await writeJSON(PATHS.testCases, existingCases);

      return { imported, failed };
    });
  }

  // -----------------------------------------------------------------------
  // Test Execution Operations
  // -----------------------------------------------------------------------

  async saveExecution(execution: LLMTestExecution): Promise<LLMTestExecution> {
    // Save to main executions index
    const indexData = await readJSON<{ executions: string[] }>(PATHS.executionsIndex);
    const executions = indexData?.executions || [];

    // Check for duplicates by content hash
    const existing = executions.find(id => {
      // Would need to load execution to check hash, skipping for performance
      return false;
    });

    if (!existing) {
      executions.unshift(execution.id);

      // Keep index size manageable (max 10,000 entries)
      if (executions.length > 10000) {
        executions.splice(10000);
      }

      await writeJSON(PATHS.executionsIndex, { executions });
    }

    // Save individual execution file (CR-1: safe path)
    const executionsDir = path.dirname(PATHS.executionsIndex);
    const executionPath = safeFilePath(executionsDir, execution.id);
    await writeJSON(executionPath, execution);

    // Update model summary if needed
    await this.updateModelSummary(execution);

    return execution;
  }

  async getExecution(id: string): Promise<LLMTestExecution | null> {
    const executionsDir = path.dirname(PATHS.executionsIndex);
    const executionPath = safeFilePath(executionsDir, id);
    return await readJSON<LLMTestExecution>(executionPath);
  }

  async queryExecutions(query: ExecutionQuery): Promise<{
    executions: LLMTestExecution[];
    total: number;
  }> {
    const indexData = await readJSON<{ executions: string[] }>(PATHS.executionsIndex);
    const executionIds = indexData?.executions || [];

    // Load and filter executions
    const executions: LLMTestExecution[] = [];
    for (const id of executionIds) {
      const execution = await this.getExecution(id);
      if (execution) {
        let matches = true;

        if (query.modelConfigId && execution.modelConfigId !== query.modelConfigId) {
          matches = false;
        }
        if (query.testCaseId && execution.testCaseId !== query.testCaseId) {
          matches = false;
        }
        if (query.status && execution.status !== query.status) {
          matches = false;
        }
        if (query.minScore !== undefined && execution.resilienceScore < query.minScore) {
          matches = false;
        }
        if (query.maxScore !== undefined && execution.resilienceScore > query.maxScore) {
          matches = false;
        }
        if (query.startDate && execution.timestamp < query.startDate) {
          matches = false;
        }
        if (query.endDate && execution.timestamp > query.endDate) {
          matches = false;
        }
        if (!query.includeCached && execution.cached) {
          matches = false;
        }

        if (matches) {
          executions.push(execution);
        }
      }
    }

    const sortDirection = query.sortDirection === 'asc' ? 1 : -1;
    const sortKey = (query.sortBy ?? 'timestamp') as keyof LLMTestExecution;

    executions.sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * sortDirection;
      }

      if (typeof leftValue === 'boolean' && typeof rightValue === 'boolean') {
        return (Number(leftValue) - Number(rightValue)) * sortDirection;
      }

      return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * sortDirection;
    });

    // Pagination
    const total = executions.length;
    if (query.limit !== undefined) {
      const offset = query.offset || 0;
      executions.splice(0, offset);
      executions.splice(query.limit);
    }

    return { executions, total };
  }

  async getRecentExecutions(modelConfigId: string, limit: number = 1000): Promise<LLMTestExecution[]> {
    const { executions } = await this.queryExecutions({
      modelConfigId,
      limit,
      sortBy: 'timestamp',
      sortDirection: 'desc',
    });

    return executions;
  }

  async deleteExecution(id: string): Promise<boolean> {
    const executionsDir = path.dirname(PATHS.executionsIndex);
    const executionPath = safeFilePath(executionsDir, id);

    try {
      await fs.unlink(executionPath);

      // Remove from index
      const indexData = await readJSON<{ executions: string[] }>(PATHS.executionsIndex);
      if (indexData?.executions) {
        indexData.executions = indexData.executions.filter(e => e !== id);
        await writeJSON(PATHS.executionsIndex, indexData);
      }

      return true;
    } catch {
      return false;
    }
  }

  async clearOldExecutions(retentionDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const cutoffISO = cutoffDate.toISOString();

    const indexData = await readJSON<{ executions: string[] }>(PATHS.executionsIndex);
    const executions = indexData?.executions || [];

    let deleted = 0;

    for (const id of executions) {
      const execution = await this.getExecution(id);
      if (execution && execution.timestamp < cutoffISO) {
        await this.deleteExecution(id);
        deleted++;
      }
    }

    return deleted;
  }

  // -----------------------------------------------------------------------
  // Batch Execution Operations
  // -----------------------------------------------------------------------

  async createBatch(batch: Omit<LLMBatchExecution, 'id' | 'createdAt' | 'totalTests'>): Promise<LLMBatchExecution> {
    const id = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const createdAt = new Date().toISOString();

    const newBatch: LLMBatchExecution = {
      ...batch,
      id,
      createdAt,
      status: 'pending',
      completedTests: 0,
      failedTests: 0,
      totalTests: batch.testCaseIds.length * batch.modelConfigIds.length,
      executionIds: [],
    };

    await writeJSON(getBatchFilePath(id), newBatch);

    // Add to batches index
    const indexData = await readJSON<{ batches: string[] }>(PATHS.batchesIndex);
    const batches = indexData?.batches || [];
    batches.unshift(id);

    await writeJSON(PATHS.batchesIndex, { batches });

    return newBatch;
  }

  async getBatch(id: string): Promise<LLMBatchExecution | null> {
    return readJSON<LLMBatchExecution>(getBatchFilePath(id));
  }

  async updateBatch(
    id: string,
    updates: Partial<Pick<LLMBatchExecution,
      | 'status'
      | 'completedTests'
      | 'failedTests'
      | 'avgResilienceScore'
      | 'executionIds'
      | 'error'
    >>
  ): Promise<LLMBatchExecution | null> {
    const batch = await this.getBatch(id);
    if (!batch) {
      return null;
    }

    const updated: LLMBatchExecution = { ...batch, ...updates };
    await writeJSON(getBatchFilePath(id), updated);

    return updated;
  }

  async queryBatches(query: BatchQuery): Promise<{
    batches: LLMBatchExecution[];
    total: number;
  }> {
    const indexData = await readJSON<{ batches: string[] }>(PATHS.batchesIndex);
    const batchIds = indexData?.batches || [];

    const batches: LLMBatchExecution[] = [];

    for (const id of batchIds) {
      const batch = await this.getBatch(id);
      if (batch) {
        let matches = true;

        if (query.modelConfigIds?.length) {
          matches = query.modelConfigIds.some(id => batch.modelConfigIds.includes(id));
        }
        if (query.status && batch.status !== query.status) {
          matches = false;
        }
        if (query.startDate && batch.createdAt < query.startDate) {
          matches = false;
        }
        if (query.endDate && batch.createdAt > query.endDate) {
          matches = false;
        }

        if (matches) {
          batches.push(batch);
        }
      }
    }

    // Sort by creation date (newest first)
    batches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Pagination
    const total = batches.length;
    if (query.limit !== undefined) {
      const offset = query.offset || 0;
      batches.splice(0, offset);
      batches.splice(query.limit);
    }

    return { batches, total };
  }

  async getBatchExecutions(batchId: string): Promise<LLMTestExecution[]> {
    const batch = await this.getBatch(batchId);
    if (!batch) {
      return [];
    }

    const executions: LLMTestExecution[] = [];

    for (const executionId of batch.executionIds) {
      const execution = await this.getExecution(executionId);
      if (execution) {
        executions.push(execution);
      }
    }

    return executions;
  }

  async deleteBatch(id: string): Promise<boolean> {
    const batchPath = getBatchFilePath(id);

    try {
      await fs.unlink(batchPath);

      // Remove from batches index
      const indexData = await readJSON<{ batches: string[] }>(PATHS.batchesIndex);
      if (indexData?.batches) {
        indexData.batches = indexData.batches.filter(b => b !== id);
        await writeJSON(PATHS.batchesIndex, indexData);
      }

      return true;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Statistics & Reporting
  // -----------------------------------------------------------------------

  async getModelStats(modelConfigId: string): Promise<{
    totalExecutions: number;
    avgResilienceScore: number;
    injectionSuccessRate: number;
    harmfulnessRate: number;
    lastExecutionAt: string | null;
  }> {
    const { executions } = await this.queryExecutions({ modelConfigId });

    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        avgResilienceScore: 0,
        injectionSuccessRate: 0,
        harmfulnessRate: 0,
        lastExecutionAt: null,
      };
    }

    const totalScore = executions.reduce((sum, e) => sum + e.resilienceScore, 0);
    const totalInjectionSuccess = executions.reduce((sum, e) => sum + e.injectionSuccess, 0);
    const totalHarmfulness = executions.reduce((sum, e) => sum + e.harmfulness, 0);

    const lastExecution = executions.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    return {
      totalExecutions: executions.length,
      avgResilienceScore: Math.round(totalScore / executions.length),
      injectionSuccessRate: totalInjectionSuccess / executions.length,
      harmfulnessRate: totalHarmfulness / executions.length,
      lastExecutionAt: lastExecution?.timestamp || null,
    };
  }

  async getSystemStats(): Promise<{
    totalModels: number;
    totalTestCases: number;
    totalExecutions: number;
    totalBatches: number;
    avgResilienceScore: number;
  }> {
    const [modelConfigs, testCases, execIndex, batchIndex] = await Promise.all([
      readJSON<LLMModelConfig[]>(PATHS.models),
      readJSON<LLMPromptTestCase[]>(PATHS.testCases),
      readJSON<{ executions: string[] }>(PATHS.executionsIndex),
      readJSON<{ batches: string[] }>(PATHS.batchesIndex),
    ]);

    const totalModels = modelConfigs?.length || 0;
    const totalTestCases = testCases?.length || 0;
    const totalExecutions = execIndex?.executions?.length || 0;
    const totalBatches = batchIndex?.batches?.length || 0;

    // Calculate average score across all executions
    let avgScore = 0;
    if (totalExecutions > 0) {
      // Sample last 100 executions for performance
      const sampleSize = Math.min(totalExecutions, 100);
      let totalScore = 0;
      let sampled = 0;

      for (const id of execIndex?.executions?.slice(0, sampleSize) || []) {
        const execution = await this.getExecution(id);
        if (execution) {
          totalScore += execution.resilienceScore;
          sampled++;
        }
      }

      avgScore = sampled > 0 ? Math.round(totalScore / sampled) : 0;
    }

    return {
      totalModels,
      totalTestCases,
      totalExecutions,
      totalBatches,
      avgResilienceScore: avgScore,
    };
  }

  // -----------------------------------------------------------------------
  // Maintenance
  // -----------------------------------------------------------------------

  async cleanup(retentionDays: number): Promise<{
    executionsDeleted: number;
    batchesDeleted: number;
  }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const cutoffISO = cutoffDate.toISOString();

    // Clean up old batches
    const batchIndex = await readJSON<{ batches: string[] }>(PATHS.batchesIndex);
    let batchesDeleted = 0;

    if (batchIndex?.batches) {
      for (const id of batchIndex.batches) {
        const batch = await this.getBatch(id);
        if (batch && batch.createdAt < cutoffISO) {
          await this.deleteBatch(id);
          batchesDeleted++;
        }
      }
    }

    // Clean up old executions
    const executionsDeleted = await this.clearOldExecutions(retentionDays);

    return { executionsDeleted, batchesDeleted };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    storageUsed: number;
    storageLimit: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let storageUsed = 0;

    try {
      // Calculate storage used
      const stats = await Promise.all([
        fs.stat(PATHS.models).catch(() => null),
        fs.stat(PATHS.testCases).catch(() => null),
        fs.stat(PATHS.executionsIndex).catch(() => null),
        fs.stat(PATHS.batchesIndex).catch(() => null),
      ]);

      for (const stat of stats) {
        if (stat) {
          storageUsed += stat.size;
        }
      }
    } catch (error) {
      errors.push(`Storage check failed: ${error}`);
    }

    // Simple health check: ensure data directory is writable
    try {
      await fs.access(DATA_BASE_DIR, fs.constants.W_OK);
    } catch {
      errors.push('Data directory is not writable');
    }

    return {
      healthy: errors.length === 0,
      storageUsed,
      storageLimit: 10 * 1024 * 1024 * 1024, // 10GB limit
      errors,
    };
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  private async updateModelSummary(execution: LLMTestExecution): Promise<void> {
    const summaryPath = getModelSummaryPath(execution.modelConfigId);
    const summary = await readJSON<{
      executions: string[];
      avgScore: number;
      lastUpdated: string;
    }>(summaryPath);

    const executions = summary?.executions || [];
    executions.unshift(execution.id);

    // Keep last 1000 execution references
    if (executions.length > 1000) {
      executions.splice(1000);
    }

    // Recalculate average score from sampled executions
    let totalScore = 0;
    let sampled = 0;

    for (const id of executions.slice(0, 100)) {
      const exec = await this.getExecution(id);
      if (exec) {
        totalScore += exec.resilienceScore;
        sampled++;
      }
    }

    await writeJSON(summaryPath, {
      executions,
      avgScore: sampled > 0 ? Math.round(totalScore / sampled) : 0,
      lastUpdated: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const fileStorage = new FileStorage();
