/**
 * File: storage-interface.ts
 * Purpose: Storage abstraction layer for database migration path
 * Index:
 * - IStorageBackend interface (line 15)
 * - Storage options types (line 77)
 * - Query options (line 102)
 */

import type { LLMModelConfig, LLMPromptTestCase, LLMTestExecution, LLMBatchExecution } from '../llm-types';

// ===========================================================================
// Storage Backend Interface
// ===========================================================================

/**
 * Abstract storage interface for LLM testing data
 *
 * This abstraction allows for future database migration without changing
 * application logic. Implementations include FileStorage, SQLiteStorage, etc.
 */
export interface IStorageBackend {
  // -----------------------------------------------------------------------
  // Model Config Operations
  // -----------------------------------------------------------------------

  /**
   * Get all model configurations
   */
  getModelConfigs(): Promise<LLMModelConfig[]>;

  /**
   * Get a specific model configuration by ID
   */
  getModelConfig(id: string): Promise<LLMModelConfig | null>;

  /**
   * Save a model configuration (create or update)
   */
  saveModelConfig(config: LLMModelConfig): Promise<LLMModelConfig>;

  /**
   * Delete a model configuration
   */
  deleteModelConfig(id: string): Promise<boolean>;

  /**
   * Enable/disable a model configuration
   */
  setModelConfigEnabled(id: string, enabled: boolean): Promise<boolean>;

  // -----------------------------------------------------------------------
  // Test Case Operations
  // -----------------------------------------------------------------------

  /**
   * Get all test cases
   */
  getTestCases(options?: StorageQueryOptions): Promise<LLMPromptTestCase[]>;

  /**
   * Get a specific test case by ID
   */
  getTestCase(id: string): Promise<LLMPromptTestCase | null>;

  /**
   * Save a test case (create or update)
   */
  saveTestCase(testCase: LLMPromptTestCase): Promise<LLMPromptTestCase>;

  /**
   * Delete a test case
   */
  deleteTestCase(id: string): Promise<boolean>;

  /**
   * Batch import test cases
   */
  importTestCases(testCases: LLMPromptTestCase[]): Promise<{ imported: number; failed: number }>;

  // -----------------------------------------------------------------------
  // Test Execution Operations
  // -----------------------------------------------------------------------

  /**
   * Save a test execution result
   */
  saveExecution(execution: LLMTestExecution): Promise<LLMTestExecution>;

  /**
   * Get a specific execution by ID
   */
  getExecution(id: string): Promise<LLMTestExecution | null>;

  /**
   * Query executions with filters
   */
  queryExecutions(query: ExecutionQuery): Promise<{
    executions: LLMTestExecution[];
    total: number;
  }>;

  /**
   * Get recent executions for a model
   */
  getRecentExecutions(modelConfigId: string, limit?: number): Promise<LLMTestExecution[]>;

  /**
   * Delete an execution
   */
  deleteExecution(id: string): Promise<boolean>;

  /**
   * Clear old executions based on retention policy
   */
  clearOldExecutions(retentionDays: number): Promise<number>;

  // -----------------------------------------------------------------------
  // Batch Execution Operations
  // -----------------------------------------------------------------------

  /**
   * Create a batch execution
   */
  createBatch(batch: Omit<LLMBatchExecution, 'id' | 'createdAt' | 'totalTests'>): Promise<LLMBatchExecution>;

  /**
   * Get a batch by ID
   */
  getBatch(id: string): Promise<LLMBatchExecution | null>;

  /**
   * Update batch status and progress
   */
  updateBatch(
    id: string,
    updates: Partial<Pick<LLMBatchExecution,
      | 'status'
      | 'completedTests'
      | 'failedTests'
      | 'avgResilienceScore'
      | 'error'
    >>
  ): Promise<LLMBatchExecution | null>;

  /**
   * Query batches with filters
   */
  queryBatches(query: BatchQuery): Promise<{
    batches: LLMBatchExecution[];
    total: number;
  }>;

  /**
   * Get all executions for a batch
   */
  getBatchExecutions(batchId: string): Promise<LLMTestExecution[]>;

  /**
   * Delete a batch
   */
  deleteBatch(id: string): Promise<boolean>;

  // -----------------------------------------------------------------------
  // Statistics & Reporting
  // -----------------------------------------------------------------------

  /**
   * Get execution statistics for a model
   */
  getModelStats(modelConfigId: string): Promise<{
    totalExecutions: number;
    avgResilienceScore: number;
    injectionSuccessRate: number;
    harmfulnessRate: number;
    lastExecutionAt: string | null;
  }>;

  /**
   * Get overall system statistics
   */
  getSystemStats(): Promise<{
    totalModels: number;
    totalTestCases: number;
    totalExecutions: number;
    totalBatches: number;
    avgResilienceScore: number;
  }>;

  // -----------------------------------------------------------------------
  // Maintenance
  // -----------------------------------------------------------------------

  /**
   * Clean up expired data based on retention policy
   */
  cleanup(retentionDays: number): Promise<{
    executionsDeleted: number;
    batchesDeleted: number;
  }>;

  /**
   * Check storage health and available space
   */
  healthCheck(): Promise<{
    healthy: boolean;
    storageUsed: number;
    storageLimit: number;
    errors: string[];
  }>;
}

// ===========================================================================
// Query Options Types
// ===========================================================================

/**
 * Generic query options for filtering and pagination
 */
export interface StorageQueryOptions {
  /** Filter by category */
  category?: string;

  /** Filter by OWASP category */
  owaspCategory?: string;

  /** Filter by TPI story */
  tpiStory?: string;

  /** Filter by enabled status */
  enabled?: boolean;

  /** Filter by tags */
  tags?: string[];

  /** Number of results to return */
  limit?: number;

  /** Number of results to skip */
  offset?: number;

  /** Sort field */
  sortBy?: string;

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Query options for execution filtering
 */
export interface ExecutionQuery {
  /** Filter by model config ID */
  modelConfigId?: string;

  /** Filter by test case ID */
  testCaseId?: string;

  /** Filter by execution status */
  status?: LLMTestExecution['status'];

  /** Filter by minimum score */
  minScore?: number;

  /** Filter by maximum score */
  maxScore?: number;

  /** Start date filter (ISO timestamp) */
  startDate?: string;

  /** End date filter (ISO timestamp) */
  endDate?: string;

  /** Whether to include cached results */
  includeCached?: boolean;

  /** Pagination options */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort field */
  sortBy?: string;

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Query options for batch filtering
 */
export interface BatchQuery {
  /** Filter by model config IDs */
  modelConfigIds?: string[];

  /** Filter by batch status */
  status?: LLMBatchExecution['status'];

  /** Start date filter */
  startDate?: string;

  /** End date filter */
  endDate?: string;

  /** Pagination options */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

// ===========================================================================
// Storage Options
// ===========================================================================

/**
 * Options for storage operations
 */
export interface StorageOptions {
  /** Whether to skip validation (for bulk imports) */
  skipValidation?: boolean;

  /** Whether to create indexes (for database backends) */
  createIndexes?: boolean;

  /** Timeout for operations in milliseconds */
  timeout?: number;
}

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult {
  /** Number of successful operations */
  success: number;

  /** Number of failed operations */
  failed: number;

  /** IDs of affected items */
  affectedIds: string[];

  /** Any errors that occurred */
  errors: Array<{ id: string; error: string }>;
}
