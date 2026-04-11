/**
 * File: LLMModelContext.tsx
 * Purpose: Model configuration state management (client-side)
 * Index:
 * - LLMModelContext interface (line 23)
 * - Provider function (line 70)
 * - Hook (line 155)
 * Note: Uses API routes for server-side storage operations
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import type { LLMModelConfig, LLMProvider } from '../llm-types';
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

interface LLMModelContextValue {
  /** All configured models */
  models: LLMModelConfig[];

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;

  /** Get a specific model by ID */
  getModel: (id: string) => LLMModelConfig | undefined;

  /** Add or update a model */
  saveModel: (model: Omit<LLMModelConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LLMModelConfig>;

  /** Update an existing model */
  updateModel: (id: string, updates: Partial<LLMModelConfig>) => Promise<LLMModelConfig>;

  /** Delete a model */
  deleteModel: (id: string) => Promise<boolean>;

  /** Enable/disable a model */
  toggleModel: (id: string, enabled: boolean) => Promise<boolean>;

  /** Test a model connection */
  testModel: (id: string) => Promise<{ success: boolean; error?: string; durationMs?: number }>;

  /** Refresh models list */
  refresh: () => Promise<void>;

  /** Get models by provider */
  getModelsByProvider: (provider: LLMProvider) => LLMModelConfig[];

  /** Get enabled models only */
  getEnabledModels: () => LLMModelConfig[];
}

const LLMModelContext = createContext<LLMModelContextValue | undefined>(undefined);

// ===========================================================================
// Provider Component
// ===========================================================================

interface LLMModelProviderProps {
  children: React.ReactNode;
}

export function LLMModelProvider({ children }: LLMModelProviderProps) {
  const [models, setModels] = useState<LLMModelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load models on mount
  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!(await canAccessProtectedApi())) {
        setModels([]);
        return;
      }

      const loadedModels = await apiFetch<LLMModelConfig[]>('/models');
      setModels(loadedModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Get a specific model
  const getModel = useCallback(
    (id: string) => {
      return models.find(m => m.id === id);
    },
    [models]
  );

  // Save a new or updated model
  const saveModel = useCallback(
    async (modelData: Omit<LLMModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<LLMModelConfig> => {
      const response = await apiFetch<{ model: LLMModelConfig }>('/models', {
        method: 'POST',
        body: JSON.stringify(modelData),
      });

      setModels(prev => [...prev, response.model]);
      return response.model;
    },
    []
  );

  // Update an existing model
  const updateModel = useCallback(
    async (id: string, updates: Partial<LLMModelConfig>): Promise<LLMModelConfig> => {
      const response = await apiFetch<{ model: LLMModelConfig }>(`/models/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      setModels(prev => prev.map(m => m.id === id ? response.model : m));
      return response.model;
    },
    []
  );

  // Delete a model
  const deleteModel = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiFetch(`/models/${id}`, { method: 'DELETE' });
        setModels(prev => prev.filter(m => m.id !== id));
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // Enable/disable a model
  const toggleModel = useCallback(
    async (id: string, enabled: boolean): Promise<boolean> => {
      try {
        const response = await apiFetch<{ model: LLMModelConfig }>(`/models/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ enabled }),
        });

        setModels(prev =>
          prev.map(m => m.id === id ? response.model : m)
        );
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // Test a model connection
  const testModel = useCallback(
    async (id: string) => {
      try {
        return await apiFetch<{ success: boolean; error?: string; durationMs?: number }>(
          `/models/${id}/test`,
          { method: 'POST' }
        );
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Test failed',
        };
      }
    },
    []
  );

  // Refresh models
  const refresh = useCallback(async () => {
    await loadModels();
  }, [loadModels]);

  // Get models by provider
  const getModelsByProvider = useCallback(
    (provider: LLMProvider) => {
      return models.filter(m => m.provider === provider);
    },
    [models]
  );

  // Get enabled models
  const getEnabledModels = useCallback(() => {
    return models.filter(m => m.enabled);
  }, [models]);

  const value: LLMModelContextValue = {
    models,
    isLoading,
    error,
    getModel,
    saveModel,
    updateModel,
    deleteModel,
    toggleModel,
    testModel,
    refresh,
    getModelsByProvider,
    getEnabledModels,
  };

  return React.createElement(LLMModelContext.Provider, { value }, children);
}

// ===========================================================================
// Hooks
// ===========================================================================

/**
 * Hook to access model context
 */
export function useModelContext(): LLMModelContextValue {
  const context = useContext(LLMModelContext);

  if (!context) {
    throw new Error('useModelContext must be used within LLMModelProvider');
  }

  return context;
}

/**
 * Hook to get a specific model
 */
export function useModel(id: string): LLMModelConfig | undefined {
  const { getModel } = useModelContext();
  return getModel(id);
}

/**
 * Hook to get models by provider
 */
export function useModelsByProvider(provider: LLMProvider): LLMModelConfig[] {
  const { getModelsByProvider } = useModelContext();
  return getModelsByProvider(provider);
}

/**
 * Hook to get enabled models
 */
export function useEnabledModels(): LLMModelConfig[] {
  const { getEnabledModels } = useModelContext();
  return getEnabledModels();
}
