/**
 * File: LLMExecutionContext.tsx
 * Purpose: Test execution state management (client-side)
 * Index:
 * - LLMExecutionContext interface (line 32)
 * - Provider function (line 90)
 * - Hook (line 190)
 * Note: Uses API routes for server-side storage operations
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import type {
  LLMTestExecution,
  LLMBatchExecution,
  LLMModelConfig,
  LLMPromptTestCase,
  ExecutionStatus,
} from '../llm-types';

// ===========================================================================
// API Client Functions
// ===========================================================================

/**
 * Base API path for LLM operations
 */
const API_BASE = '/api/llm';

/**
 * Fetch wrapper for API calls
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ===========================================================================
// Types
// ===========================================================================

interface ExecutionState {
  /** Active batch IDs */
  activeBatches: string[];

  /** Pending executions */
  pendingCount: number;

  /** Currently running test count */
  runningCount: number;

  /** Last execution timestamp */
  lastExecutionAt: string | null;
}

interface LLMExecutionContextValue {
  /** Current execution state */
  state: ExecutionState;

  /** Get executions for a model */
  getExecutions: (modelId: string, limit?: number) => Promise<LLMTestExecution[]>;

  /** Get a specific execution */
  getExecution: (id: string) => Promise<LLMTestExecution | null>;

  /** Execute a single test */
  executeTest: (
    model: LLMModelConfig,
    testCase: LLMPromptTestCase
  ) => Promise<LLMTestExecution>;

  /** Execute a batch of tests */
  executeBatch: (
    models: LLMModelConfig[],
    testCases: LLMPromptTestCase[],
    onProgress?: (batch: LLMBatchExecution) => void
  ) => Promise<LLMBatchExecution>;

  /** Get batch details */
  getBatch: (batchId: string) => Promise<LLMBatchExecution | null>;

  /** Get executions for a batch */
  getBatchExecutions: (batchId: string) => Promise<LLMTestExecution[]>;

  /** Cancel a running batch */
  cancelBatch: (batchId: string) => Promise<boolean>;

  /** Clear old executions */
  clearOldExecutions: (retentionDays: number) => Promise<number>;

  /** Refresh execution state */
  refreshState: () => Promise<void>;
}

const LLMExecutionContext = createContext<LLMExecutionContextValue | undefined>(undefined);

// ===========================================================================
// Provider Component
// ===========================================================================

interface LLMExecutionProviderProps {
  children: React.ReactNode;
  /** Refresh interval in milliseconds (default: 5000) */
  refreshInterval?: number;
}

export function LLMExecutionProvider({ children, refreshInterval = 5000 }: LLMExecutionProviderProps) {
  const [state, setState] = useState<ExecutionState>({
    activeBatches: [],
    pendingCount: 0,
    runningCount: 0,
    lastExecutionAt: null,
  });

  // Refresh execution state
  const refreshState = useCallback(async () => {
    try {
      // Fetch active batches from API
      const { batches: runningBatches } = await apiFetch<{ batches: LLMBatchExecution[] }>(
        '/batch?status=running'
      );
      const { batches: pendingBatches } = await apiFetch<{ batches: LLMBatchExecution[] }>(
        '/batch?status=pending'
      );

      const activeBatches = [
        ...runningBatches.map(b => b.id),
        ...pendingBatches.map(b => b.id),
      ];

      const runningCount = runningBatches.reduce(
        (sum, b) => sum + (b.totalTests - b.completedTests),
        0
      );

      // Get last execution time
      const { executions } = await apiFetch<{ executions: LLMTestExecution[] }>(
        '/results?limit=1'
      );
      const lastExecutionAt = executions[0]?.timestamp || null;

      setState({
        activeBatches,
        pendingCount: pendingBatches.length,
        runningCount,
        lastExecutionAt,
      });
    } catch (err) {
      console.error('Failed to refresh execution state:', err);
    }
  }, []);

  // Auto-refresh on interval
  useEffect(() => {
    refreshState();

    if (refreshInterval > 0) {
      const interval = setInterval(refreshState, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshState]);

  // Get executions for a model
  const getExecutions = useCallback(
    async (modelId: string, limit = 100): Promise<LLMTestExecution[]> => {
      const { executions } = await apiFetch<{ executions: LLMTestExecution[] }>(
        `/results?modelConfigId=${modelId}&limit=${limit}`
      );
      return executions;
    },
    []
  );

  // Get a specific execution
  const getExecution = useCallback(
    async (id: string): Promise<LLMTestExecution | null> => {
      try {
        return await apiFetch<LLMTestExecution>(`/results/${id}`);
      } catch {
        return null;
      }
    },
    []
  );

  // Execute a single test
  const executeTest = useCallback(
    async (model: LLMModelConfig, testCase: LLMPromptTestCase): Promise<LLMTestExecution> => {
      const response = await apiFetch<{ execution: LLMTestExecution }>('/execute', {
        method: 'POST',
        body: JSON.stringify({
          modelConfigId: model.id,
          testCaseId: testCase.id,
        }),
      });

      // Refresh state after execution
      await refreshState();

      return response.execution;
    },
    [refreshState]
  );

  // Execute a batch of tests
  const executeBatch = useCallback(
    async (
      models: LLMModelConfig[],
      testCases: LLMPromptTestCase[],
      onProgress?: (batch: LLMBatchExecution) => void
    ): Promise<LLMBatchExecution> => {
      const response = await apiFetch<{ batch: LLMBatchExecution }>('/batch', {
        method: 'POST',
        body: JSON.stringify({
          modelIds: models.map(m => m.id),
          testCaseIds: testCases.map(t => t.id),
        }),
      });

      const batch = response.batch;

      // Poll for progress with proper cleanup
      const pollInterval = setInterval(async () => {
        try {
          // Check batch status directly with fetch to handle 404 gracefully
          const response = await fetch(`${API_BASE}/batch/${batch.id}`);

          // If batch not found (404), stop polling - it was cleaned up
          if (response.status === 404) {
            clearInterval(pollInterval);
            await refreshState();
            return;
          }

          if (!response.ok) {
            clearInterval(pollInterval);
            return;
          }

          const { batch: updated } = await response.json() as { batch: LLMBatchExecution };

          if (onProgress) {
            onProgress(updated);
          }

          if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
            clearInterval(pollInterval);
            await refreshState();
          }
        } catch {
          // Network error or other issue - stop polling
          clearInterval(pollInterval);
        }
      }, 1000);

      // Refresh state after starting batch
      await refreshState();

      return batch;
    },
    [refreshState]
  );

  // Get batch details
  const getBatch = useCallback(
    async (batchId: string): Promise<LLMBatchExecution | null> => {
      try {
        const response = await apiFetch<{ batch: LLMBatchExecution }>(`/batch/${batchId}`);
        return response.batch;
      } catch {
        return null;
      }
    },
    []
  );

  // Get executions for a batch
  const getBatchExecutions = useCallback(
    async (batchId: string): Promise<LLMTestExecution[]> => {
      try {
        const response = await apiFetch<{ executions: LLMTestExecution[] }>(
          `/batch/${batchId}/executions`
        );
        return response.executions;
      } catch {
        return [];
      }
    },
    []
  );

  // Cancel a running batch
  const cancelBatch = useCallback(
    async (batchId: string): Promise<boolean> => {
      try {
        await apiFetch(`/batch/${batchId}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
        await refreshState();
        return true;
      } catch {
        return false;
      }
    },
    [refreshState]
  );

  // Clear old executions
  const clearOldExecutions = useCallback(
    async (retentionDays: number): Promise<number> => {
      try {
        const response = await apiFetch<{ deleted: number }>(
          `/results/cleanup?retentionDays=${retentionDays}`,
          { method: 'DELETE' }
        );
        await refreshState();
        return response.deleted;
      } catch {
        return 0;
      }
    },
    [refreshState]
  );

  const value: LLMExecutionContextValue = {
    state,
    getExecutions,
    getExecution,
    executeTest,
    executeBatch,
    getBatch,
    getBatchExecutions,
    cancelBatch,
    clearOldExecutions,
    refreshState,
  };

  return React.createElement(LLMExecutionContext.Provider, { value }, children);
}

// ===========================================================================
// Hooks
// ===========================================================================

/**
 * Hook to access execution context
 */
export function useExecutionContext(): LLMExecutionContextValue {
  const context = useContext(LLMExecutionContext);

  if (!context) {
    throw new Error('useExecutionContext must be used within LLMExecutionProvider');
  }

  return context;
}

/**
 * Hook to get execution state
 */
export function useExecutionState(): ExecutionState {
  const { state } = useExecutionContext();
  return state;
}

/**
 * Hook to check if any tests are running
 */
export function useIsExecuting(): boolean {
  const { state } = useExecutionContext();
  return state.runningCount > 0 || state.activeBatches.length > 0;
}
