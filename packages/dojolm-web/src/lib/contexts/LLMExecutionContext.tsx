/**
 * File: LLMExecutionContext.tsx
 * Purpose: Test execution state management (client-side)
 * Index:
 * - LLMExecutionContext interface (line 34)
 * - Provider function (line 100)
 * - Hook (line 220)
 * Note: Uses API routes for server-side storage operations
 * H1.5: Added activeBatchId persistence to sessionStorage for reconnection
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

import type {
  LLMTestExecution,
  LLMBatchExecution,
  LLMModelConfig,
  LLMPromptTestCase,
  ExecutionStatus,
} from '../llm-types';
import { canAccessProtectedApi } from '../client-auth-access';
import { fetchWithAuth } from '../fetch-with-auth';
import { activeBatchStore } from '@/lib/stores';

// ===========================================================================
// Batch ID Persistence (H1.5)
// ===========================================================================

const BATCH_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/** Validate batch ID format */
function isValidBatchId(id: unknown): id is string {
  return typeof id === 'string' && BATCH_ID_REGEX.test(id);
}

/** Read active batch ID from sessionStorage via typed store */
function loadActiveBatchId(): string | null {
  const stored = activeBatchStore.get();
  return stored && isValidBatchId(stored) ? stored : null;
}

/** Write active batch ID to sessionStorage via typed store */
function saveActiveBatchId(batchId: string): void {
  activeBatchStore.set(batchId);
}

/** Clear active batch ID from sessionStorage via typed store */
function clearActiveBatchId(): void {
  activeBatchStore.remove();
}

// ===========================================================================
// API Client Functions
// ===========================================================================

/**
 * Base API path for LLM operations
 */
const API_BASE = '/api/llm';

/**
 * Fetch wrapper for API calls with auth (Story 13.9)
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetchWithAuth(`${API_BASE}${endpoint}`, {
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

const EXECUTION_STATE_CACHE_TTL_MS = 2_000;

let cachedExecutionState: ExecutionState | null = null;
let cachedExecutionStateAt = 0;
let executionStateRequest: Promise<ExecutionState> | null = null;

function invalidateExecutionStateCache(): void {
  cachedExecutionState = null;
  cachedExecutionStateAt = 0;
  executionStateRequest = null;
}

export function resetExecutionStateCache(): void {
  invalidateExecutionStateCache();
}

async function loadExecutionState(force = false): Promise<ExecutionState> {
  if (!(await canAccessProtectedApi())) {
    const emptyState: ExecutionState = {
      activeBatches: [],
      pendingCount: 0,
      runningCount: 0,
      lastExecutionAt: null,
    };
    cachedExecutionState = emptyState;
    cachedExecutionStateAt = Date.now();
    return emptyState;
  }

  const now = Date.now();
  if (!force && cachedExecutionState && now - cachedExecutionStateAt < EXECUTION_STATE_CACHE_TTL_MS) {
    return cachedExecutionState;
  }

  if (!force && executionStateRequest) {
    return executionStateRequest;
  }

  executionStateRequest = (async () => {
    const [
      { batches: runningBatches },
      { batches: pendingBatches },
      { executions },
    ] = await Promise.all([
      apiFetch<{ batches: LLMBatchExecution[] }>('/batch?status=running'),
      apiFetch<{ batches: LLMBatchExecution[] }>('/batch?status=pending'),
      apiFetch<{ executions: LLMTestExecution[] }>('/results?limit=1'),
    ]);

    const activeBatches = [
      ...runningBatches.map((batch) => batch.id),
      ...pendingBatches.map((batch) => batch.id),
    ];

    const snapshot: ExecutionState = {
      activeBatches,
      pendingCount: pendingBatches.length,
      runningCount: runningBatches.reduce(
        (sum, batch) => sum + (batch.totalTests - batch.completedTests),
        0,
      ),
      lastExecutionAt: executions[0]?.timestamp || null,
    };

    cachedExecutionState = snapshot;
    cachedExecutionStateAt = Date.now();
    return snapshot;
  })().finally(() => {
    executionStateRequest = null;
  });

  return executionStateRequest;
}

interface LLMExecutionContextValue {
  /** Current execution state */
  state: ExecutionState;

  /** Active batch ID persisted to sessionStorage (H1.5) */
  activeBatchId: string | null;

  /** Batch ID currently being reconnected to (H1.5) */
  reconnectingBatchId: string | null;

  /** Set active batch (persists to sessionStorage) (H1.5) */
  setActiveBatch: (batchId: string) => void;

  /** Clear active batch (removes from sessionStorage) (H1.5) */
  clearActiveBatch: () => void;

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

  // H1.5: Active batch ID persistence
  const [activeBatchId, setActiveBatchIdState] = useState<string | null>(null);
  const [reconnectingBatchId, setReconnectingBatchId] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const batchPollIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());

  // H1.5: Set active batch (validates and persists)
  const setActiveBatch = useCallback((batchId: string) => {
    if (!isValidBatchId(batchId)) return;
    setActiveBatchIdState(batchId);
    saveActiveBatchId(batchId);
  }, []);

  // H1.5: Clear active batch
  const clearActiveBatch = useCallback(() => {
    setActiveBatchIdState(null);
    setReconnectingBatchId(null);
    clearActiveBatchId();
  }, []);

  // Refresh execution state
  const refreshState = useCallback(async () => {
    try {
      setState(await loadExecutionState());
    } catch (err) {
      console.error('Failed to refresh execution state:', err);
    }
  }, []);

  // Initial state load
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // H1.5: Hydrate activeBatchId from sessionStorage and attempt reconnection
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const storedBatchId = loadActiveBatchId();
    if (!storedBatchId) return;

    setActiveBatchIdState(storedBatchId);
    setReconnectingBatchId(storedBatchId);

    // Check if batch is still running
    (async () => {
      try {
        if (!(await canAccessProtectedApi())) {
          clearActiveBatchId();
          setActiveBatchIdState(null);
          setReconnectingBatchId(null);
          return;
        }

        const response = await fetchWithAuth(`${API_BASE}/batch/${encodeURIComponent(storedBatchId)}`);
        if (!response.ok) {
          // Batch gone or errored — clear
          clearActiveBatchId();
          setActiveBatchIdState(null);
          setReconnectingBatchId(null);
          return;
        }
        const { batch } = await response.json() as { batch: LLMBatchExecution };
        if (batch.status === 'running' || batch.status === 'pending') {
          // Batch still active — keep reconnectingBatchId so TestExecution can resume
          // reconnectingBatchId will be cleared by TestExecution after it reconnects
        } else {
          // Batch finished — clear
          clearActiveBatchId();
          setActiveBatchIdState(null);
          setReconnectingBatchId(null);
        }
      } catch {
        clearActiveBatchId();
        setActiveBatchIdState(null);
        setReconnectingBatchId(null);
      }
    })();
  }, []); // hydration runs once

  // Cleanup all active polling intervals on unmount
  useEffect(() => {
    const intervalsRef = batchPollIntervalsRef;
    return () => {
      for (const id of intervalsRef.current) clearInterval(id);
      intervalsRef.current.clear();
    };
  }, []);

  // Auto-refresh on interval (only when there are active batches to avoid wasted requests)
  useEffect(() => {
    if (refreshInterval > 0 && state.activeBatches.length > 0) {
      const interval = setInterval(refreshState, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshState, state.activeBatches.length]);

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
      invalidateExecutionStateCache();
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
          const response = await fetchWithAuth(`${API_BASE}/batch/${batch.id}`);

          // If batch not found (404), stop polling - it was cleaned up
          if (response.status === 404) {
            clearInterval(pollInterval);
            batchPollIntervalsRef.current.delete(pollInterval);
            invalidateExecutionStateCache();
            await refreshState();
            return;
          }

          if (!response.ok) {
            clearInterval(pollInterval);
            batchPollIntervalsRef.current.delete(pollInterval);
            return;
          }

          const { batch: updated } = await response.json() as { batch: LLMBatchExecution };

          if (onProgress) {
            onProgress(updated);
          }

          if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
            clearInterval(pollInterval);
            batchPollIntervalsRef.current.delete(pollInterval);
            invalidateExecutionStateCache();
            await refreshState();
          }
        } catch {
          // Network error or other issue - stop polling
          clearInterval(pollInterval);
          batchPollIntervalsRef.current.delete(pollInterval);
        }
      }, 3000);
      batchPollIntervalsRef.current.add(pollInterval);

      // Refresh state after starting batch
      invalidateExecutionStateCache();
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
        invalidateExecutionStateCache();
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
        invalidateExecutionStateCache();
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
    activeBatchId,
    reconnectingBatchId,
    setActiveBatch,
    clearActiveBatch,
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
