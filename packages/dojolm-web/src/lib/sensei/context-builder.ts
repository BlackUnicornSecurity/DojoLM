/**
 * Sensei — Context Builder
 * SH1.3: Build SenseiContext for system prompt injection.
 */

import type { NextRequest } from 'next/server';
import type { NavId } from '../constants';
import type { SenseiContext } from './types';
import { DEFAULT_GUARD_CONFIG } from '../guard-constants';

// ---------------------------------------------------------------------------
// Server-side context builder (used in API route)
// ---------------------------------------------------------------------------

/**
 * Build full SenseiContext by reading storage.
 * Imports are dynamic to avoid pulling Node.js modules into client bundles.
 */
export async function buildSenseiContext(
  activeModule: NavId,
  _request: NextRequest,
): Promise<SenseiContext> {
  const [{ getGuardConfig }, { getStorage }] = await Promise.all([
    import('../storage/guard-storage'),
    import('../storage/storage-interface'),
  ]);

  const [guardConfig, storage] = await Promise.all([
    getGuardConfig(),
    getStorage(),
  ]);

  const modelConfigs = await storage.getModelConfigs();
  const configuredModels = modelConfigs
    .filter((m) => m.enabled)
    .map((m) => m.name);

  const recentActivity = await getRecentActivity(storage);

  return {
    activeModule,
    guardConfig,
    configuredModels,
    recentActivity,
    userRole: 'admin', // Derived from auth in SH5; default for now
  };
}

// ---------------------------------------------------------------------------
// Client-side context builder (used in useSensei hook)
// ---------------------------------------------------------------------------

export interface ClientContextInput {
  readonly activeModule: NavId;
  readonly guardEnabled?: boolean;
  readonly guardMode?: string;
  readonly modelNames?: readonly string[];
}

/**
 * Lightweight context for client-side injection — no storage access.
 */
export function buildClientContext(input: ClientContextInput): SenseiContext {
  return {
    activeModule: input.activeModule,
    guardConfig: {
      enabled: input.guardEnabled ?? false,
      mode: (input.guardMode as 'shinobi' | 'samurai' | 'sensei' | 'hattori') ?? DEFAULT_GUARD_CONFIG.mode,
      blockThreshold: 'WARNING',
      engines: null,
      persist: false,
    },
    configuredModels: input.modelNames ? [...input.modelNames] : [],
    recentActivity: [],
    userRole: 'user',
  };
}

// ---------------------------------------------------------------------------
// Recent activity (capped at 5)
// ---------------------------------------------------------------------------

const MAX_RECENT_ITEMS = 5;

interface IStorageWithQuery {
  queryExecutions(query: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    executions: readonly {
      readonly testCaseId?: string;
      readonly modelConfigId?: string;
      readonly timestamp?: string;
    }[];
    total: number;
  }>;
}

async function getRecentActivity(
  storage: IStorageWithQuery,
): Promise<readonly string[]> {
  try {
    const { executions } = await storage.queryExecutions({
      limit: MAX_RECENT_ITEMS,
      sortBy: 'timestamp',
      sortDirection: 'desc',
    });
    return executions.map(
      (e) =>
        `${e.testCaseId ?? 'test'} on ${e.modelConfigId ?? 'model'} at ${e.timestamp ?? 'unknown'}`,
    );
  } catch {
    return [];
  }
}
