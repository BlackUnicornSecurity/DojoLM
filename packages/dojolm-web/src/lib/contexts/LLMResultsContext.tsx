/**
 * File: LLMResultsContext.tsx
 * Purpose: Results and reporting state management (client-side)
 * Index:
 * - LLMResultsContext interface (line 25)
 * - Provider function (line 75)
 * - Hook (line 175)
 * Note: Uses API routes for server-side storage operations
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import type {
  LLMModelReport,
  LLMTestExecution,
  CoverageMap,
  ReportRequest,
  ManualEvaluation,
  ResultsFilter,
} from '../llm-types';
import { canAccessProtectedApi } from '../client-auth-access';
import { fetchWithAuth } from '../fetch-with-auth';

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

interface LLMResultsContextValue {
  /** Current filter */
  filter: ResultsFilter;

  /** Update filter */
  setFilter: (filter: Partial<ResultsFilter>) => void;

  /** Clear filter */
  clearFilter: () => void;

  /** Get filtered executions */
  getExecutions: (filter?: ResultsFilter) => Promise<LLMTestExecution[]>;

  /** Get model report */
  getModelReport: (modelId: string) => Promise<LLMModelReport>;

  /** Get coverage map */
  getCoverageMap: (modelId?: string) => Promise<CoverageMap>;

  /** Get comparison report (multiple models) */
  getComparisonReport: (modelIds: string[]) => Promise<LLMModelReport[]>;

  /** Get leaderboard (all models ranked) */
  getLeaderboard: () => Promise<Array<{ modelId: string; modelName: string; score: number; rank: number }>>;

  /** Export report */
  exportReport: (request: ReportRequest) => Promise<string>;

  /** Add manual evaluation */
  addManualEvaluation: (evaluation: ManualEvaluation) => Promise<boolean>;

  /** Delete execution */
  deleteExecution: (id: string) => Promise<boolean>;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;

  /** Refresh results */
  refresh: () => Promise<void>;
}

const LLMResultsContext = createContext<LLMResultsContextValue | undefined>(undefined);

// ===========================================================================
// Provider Component
// ===========================================================================

interface LLMResultsProviderProps {
  children: React.ReactNode;
}

export function LLMResultsProvider({ children }: LLMResultsProviderProps) {
  const [filter, setFilterState] = useState<ResultsFilter>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update filter
  const setFilter = useCallback((updates: Partial<ResultsFilter>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear filter
  const clearFilter = useCallback(() => {
    setFilterState({});
  }, []);

  // Get filtered executions
  const getExecutions = useCallback(
    async (customFilter?: ResultsFilter): Promise<LLMTestExecution[]> => {
      const activeFilter = customFilter || filter;

      if (!(await canAccessProtectedApi())) {
        return [];
      }

      const params = new URLSearchParams();

      if (activeFilter.modelIds?.length) {
        activeFilter.modelIds.forEach(id => params.append('modelId', id));
      }
      if (activeFilter.minScore !== undefined) {
        params.set('minScore', String(activeFilter.minScore));
      }
      if (activeFilter.maxScore !== undefined) {
        params.set('maxScore', String(activeFilter.maxScore));
      }
      if (activeFilter.startDate) {
        params.set('startDate', activeFilter.startDate);
      }
      if (activeFilter.endDate) {
        params.set('endDate', activeFilter.endDate);
      }
      if (activeFilter.includeCached !== undefined) {
        params.set('includeCached', String(activeFilter.includeCached));
      }

      const queryString = params.toString();
      const response = await apiFetch<{ executions: LLMTestExecution[] }>(
        `/results${queryString ? `?${queryString}` : ''}`
      );

      let filtered = response.executions;

      // Client-side filtering for category, OWASP, TPI
      if (activeFilter.category) {
        filtered = filtered.filter((e: LLMTestExecution) =>
          e.categoriesPassed.includes(activeFilter.category!) ||
          e.categoriesFailed.includes(activeFilter.category!)
        );
      }

      if (activeFilter.owaspCategory) {
        filtered = filtered.filter((e: LLMTestExecution) =>
          activeFilter.owaspCategory! in e.owaspCoverage
        );
      }

      if (activeFilter.tpiStory) {
        filtered = filtered.filter((e: LLMTestExecution) =>
          activeFilter.tpiStory! in e.tpiCoverage
        );
      }

      return filtered;
    },
    [filter]
  );

  // Get model report
  const getModelReport = useCallback(
    async (modelId: string): Promise<LLMModelReport> => {
      return apiFetch<LLMModelReport>(`/reports?modelId=${modelId}`);
    },
    []
  );

  // Get coverage map
  const getCoverageMap = useCallback(
    async (modelId?: string): Promise<CoverageMap> => {
      const params = modelId ? `?modelId=${modelId}` : '';
      return apiFetch<CoverageMap>(`/coverage${params}`);
    },
    []
  );

  // Get comparison report
  const getComparisonReport = useCallback(
    async (modelIds: string[]): Promise<LLMModelReport[]> => {
      const reports: LLMModelReport[] = [];

      for (const modelId of modelIds) {
        reports.push(await getModelReport(modelId));
      }

      // Sort by average score descending
      reports.sort((a, b) => b.avgResilienceScore - a.avgResilienceScore);

      return reports;
    },
    [getModelReport]
  );

  // Get leaderboard
  const getLeaderboard = useCallback(
    async (): Promise<Array<{ modelId: string; modelName: string; score: number; rank: number }>> => {
      // This would need a dedicated leaderboard API endpoint
      // For now, use models API and calculate scores
      const models = await apiFetch<Array<{ id: string; name: string }>>('/models');

      const rankings = [];

      for (const model of models) {
        try {
          const report = await getModelReport(model.id);
          rankings.push({
            modelId: model.id,
            modelName: model.name,
            score: report.avgResilienceScore,
            rank: 0,
          });
        } catch {
          // Skip models without reports
        }
      }

      // Sort by score descending
      rankings.sort((a, b) => b.score - a.score);

      // Assign ranks
      rankings.forEach((r, i) => {
        r.rank = i + 1;
      });

      return rankings;
    },
    [getModelReport]
  );

  // Export report
  const exportReport = useCallback(
    async (request: ReportRequest): Promise<string> => {
      const params = new URLSearchParams();
      params.set('modelId', request.modelConfigId);
      params.set('format', request.format);
      if (request.includeExecutions) params.set('includeExecutions', 'true');
      if (request.includeResponses) params.set('includeResponses', 'true');
      if (request.minSeverity) params.set('minSeverity', request.minSeverity);
      if (request.categoryFilter) params.set('categoryFilter', request.categoryFilter.join(','));

      const response = await apiFetch<{ report: string }>(`/reports/export?${params}`);
      return response.report;
    },
    []
  );

  // Add manual evaluation
  const addManualEvaluation = useCallback(
    async (evaluation: ManualEvaluation): Promise<boolean> => {
      try {
        await apiFetch('/results/evaluation', {
          method: 'POST',
          body: JSON.stringify(evaluation),
        });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add evaluation');
        return false;
      }
    },
    []
  );

  // Delete execution
  const deleteExecution = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiFetch(`/results/${id}`, { method: 'DELETE' });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // Refresh by actually re-fetching data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await getExecutions(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, [getExecutions, filter]);

  const value: LLMResultsContextValue = {
    filter,
    setFilter,
    clearFilter,
    getExecutions,
    getModelReport,
    getCoverageMap,
    getComparisonReport,
    getLeaderboard,
    exportReport,
    addManualEvaluation,
    deleteExecution,
    isLoading,
    error,
    refresh,
  };

  return React.createElement(LLMResultsContext.Provider, { value }, children);
}

// ===========================================================================
// Hooks
// ===========================================================================

/**
 * Hook to access results context
 */
export function useResultsContext(): LLMResultsContextValue {
  const context = useContext(LLMResultsContext);

  if (!context) {
    throw new Error('useResultsContext must be used within LLMResultsProvider');
  }

  return context;
}

/**
 * Hook to get model report
 */
export function useModelReport(modelId: string) {
  const { getModelReport } = useResultsContext();
  const [report, setReport] = useState<LLMModelReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getModelReport(modelId)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setIsLoading(false));
  }, [modelId, getModelReport]);

  return { report, isLoading };
}

/**
 * Hook to get leaderboard
 */
export function useLeaderboard() {
  const { getLeaderboard } = useResultsContext();
  const [leaderboard, setLeaderboard] = useState<Array<{
    modelId: string;
    modelName: string;
    score: number;
    rank: number;
  }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setLeaderboard)
      .catch(() => setLeaderboard(null))
      .finally(() => setIsLoading(false));
  }, [getLeaderboard]);

  return { leaderboard, isLoading };
}

/**
 * Hook to get coverage map
 */
export function useCoverageMap(modelId?: string) {
  const { getCoverageMap } = useResultsContext();
  const [coverage, setCoverage] = useState<CoverageMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCoverageMap(modelId)
      .then(setCoverage)
      .catch(() => setCoverage(null))
      .finally(() => setIsLoading(false));
  }, [modelId, getCoverageMap]);

  return { coverage, isLoading };
}
