'use client';

/**
 * File: GuardContext.tsx
 * Purpose: React context for Hattori Guard state management
 * Story: TPI-UIP-11
 * Index:
 * - GuardContextValue (line 18)
 * - GuardProvider (line 40)
 * - useGuard() (line 109)
 * - useGuardMode() (line 118)
 * - useGuardStats() (line 127)
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  GuardConfig,
  GuardMode,
  GuardAuditEntry,
  GuardStats,
} from '../guard-types';
import { DEFAULT_GUARD_CONFIG } from '../guard-constants';
import { fetchWithAuth } from '../fetch-with-auth';

interface GuardContextValue {
  config: GuardConfig;
  stats: GuardStats | null;
  recentEvents: GuardAuditEntry[];
  isLoading: boolean;
  error: string | null;
  setMode: (mode: GuardMode) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setBlockThreshold: (threshold: 'CRITICAL' | 'WARNING') => Promise<void>;
  setEngines: (engines: string[] | null) => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  updateConfig: (updates: Partial<GuardConfig>) => Promise<void>;
}

const GuardContext = createContext<GuardContextValue | undefined>(undefined);

export function GuardProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<GuardConfig>({ ...DEFAULT_GUARD_CONFIG });
  const [stats, setStats] = useState<GuardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<GuardAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial state
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [configRes, statsRes, eventsRes] = await Promise.allSettled([
          fetchWithAuth('/api/llm/guard'),
          fetchWithAuth('/api/llm/guard/stats'),
          fetchWithAuth('/api/llm/guard/audit?limit=50'),
        ]);

        if (configRes.status === 'fulfilled' && configRes.value.ok) {
          const { data } = await configRes.value.json();
          setConfig(data);
        }

        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const { data } = await statsRes.value.json();
          setStats(data);
        }

        if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
          const { data } = await eventsRes.value.json();
          setRecentEvents(data);
        }
      } catch (err) {
        setError('Failed to load guard configuration');
        console.error('Guard context init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitial();
  }, []);

  const updateConfig = useCallback(async (updates: Partial<GuardConfig>) => {
    const newConfig = { ...config, ...updates };
    try {
      const res = await fetchWithAuth('/api/llm/guard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update config');
      }

      const { data } = await res.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
    }
  }, [config]);

  const setMode = useCallback(
    (mode: GuardMode) => updateConfig({ mode }),
    [updateConfig]
  );

  const setEnabled = useCallback(
    (enabled: boolean) => updateConfig({ enabled }),
    [updateConfig]
  );

  const setBlockThreshold = useCallback(
    (blockThreshold: 'CRITICAL' | 'WARNING') => updateConfig({ blockThreshold }),
    [updateConfig]
  );

  const setEngines = useCallback(
    (engines: string[] | null) => updateConfig({ engines }),
    [updateConfig]
  );

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/llm/guard/stats');
      if (res.ok) {
        const { data } = await res.json();
        setStats(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/llm/guard/audit?limit=50');
      if (res.ok) {
        const { data } = await res.json();
        setRecentEvents(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const value = useMemo<GuardContextValue>(
    () => ({
      config,
      stats,
      recentEvents,
      isLoading,
      error,
      setMode,
      setEnabled,
      setBlockThreshold,
      setEngines,
      refreshStats,
      refreshEvents,
      updateConfig,
    }),
    [config, stats, recentEvents, isLoading, error, setMode, setEnabled, setBlockThreshold, setEngines, refreshStats, refreshEvents, updateConfig]
  );

  return (
    <GuardContext.Provider value={value}>
      {children}
    </GuardContext.Provider>
  );
}

export function useGuard(): GuardContextValue {
  const context = useContext(GuardContext);
  if (!context) {
    throw new Error('useGuard must be used within GuardProvider');
  }
  return context;
}

export function useGuardMode(): { mode: GuardMode; setMode: (mode: GuardMode) => Promise<void>; enabled: boolean; setEnabled: (enabled: boolean) => Promise<void> } {
  const { config, setMode, setEnabled } = useGuard();
  return { mode: config.mode, setMode, enabled: config.enabled, setEnabled };
}

export function useGuardStats(): { stats: GuardStats | null; refreshStats: () => Promise<void> } {
  const { stats, refreshStats } = useGuard();
  return { stats, refreshStats };
}
