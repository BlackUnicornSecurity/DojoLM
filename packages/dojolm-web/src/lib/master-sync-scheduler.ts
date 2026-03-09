/**
 * File: master-sync-scheduler.ts
 * Purpose: Sync Scheduler — periodically triggers master pipeline sync
 * Story: KASHIWA-11.4
 * Index:
 * - Schedule intervals (line 24)
 * - startScheduler() (line 46)
 * - stopScheduler() (line 121)
 * - getSchedulerStatus() (line 141)
 */

import * as masterStorage from '@/lib/storage/master-storage';
import {
  syncAllSources,
  convertToAttackNodes,
  getAvailableSourceIds,
} from 'bu-tpi/attackdna';
import * as dnaStorage from '@/lib/storage/dna-storage';

// ===========================================================================
// Schedule Intervals
// ===========================================================================

const SCHEDULE_INTERVALS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

// ===========================================================================
// Scheduler State
// ===========================================================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let lastScheduledSync: string | null = null;
let schedulerRunning = false;

// ===========================================================================
// Start Scheduler
// ===========================================================================

/**
 * Start the sync scheduler based on the current sync config.
 * Only runs if autoSyncEnabled is true and schedule is not 'manual'.
 */
export async function startScheduler(): Promise<boolean> {
  // Stop existing scheduler if running
  stopScheduler();

  const config = await masterStorage.getSyncConfig();

  if (!config.autoSyncEnabled) {
    return false;
  }

  const schedule = config.syncSchedule;
  if (schedule === 'manual' || !SCHEDULE_INTERVALS[schedule]) {
    return false;
  }

  const intervalMs = SCHEDULE_INTERVALS[schedule];
  schedulerRunning = true;

  schedulerInterval = setInterval(async () => {
    try {
      await runScheduledSync();
    } catch (error) {
      console.error('[MasterSyncScheduler] Sync failed:', error instanceof Error ? error.message : String(error));
    }
  }, intervalMs);

  return true;
}

// ===========================================================================
// Run Scheduled Sync
// ===========================================================================

async function runScheduledSync(): Promise<void> {
  const config = await masterStorage.getSyncConfig();
  const sourcesToSync = config.enabledSources.length > 0
    ? config.enabledSources
    : getAvailableSourceIds();

  // Get existing entries for cross-source deduplication
  const { entries: existingEntries } = await masterStorage.queryEntries({ limit: 500 });

  // Run sync pipeline (per-source error handling — one source failing doesn't block others)
  const { entries: newEntries, syncResult } = await syncAllSources(sourcesToSync, existingEntries);

  // Store new entries
  for (const entry of newEntries) {
    await masterStorage.saveEntry(entry);
  }

  // Convert to AttackNodes for DNA graph
  const attackNodes = convertToAttackNodes(newEntries);
  for (const node of attackNodes) {
    await dnaStorage.saveNode(node);
  }

  // Update config with last sync time
  await masterStorage.saveSyncConfig({
    ...config,
    lastSyncAt: syncResult.syncedAt,
  });

  // Save to history
  await masterStorage.addSyncResult(syncResult);

  lastScheduledSync = syncResult.syncedAt;
}

// ===========================================================================
// Stop Scheduler
// ===========================================================================

/**
 * Stop the sync scheduler. Graceful shutdown — clears interval.
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  schedulerRunning = false;
}

// ===========================================================================
// Scheduler Status
// ===========================================================================

export interface SchedulerStatus {
  running: boolean;
  lastScheduledSync: string | null;
}

/**
 * Get current scheduler status.
 */
export function getSchedulerStatus(): SchedulerStatus {
  return {
    running: schedulerRunning,
    lastScheduledSync,
  };
}

// ===========================================================================
// Graceful Shutdown (register once)
// ===========================================================================

if (typeof process !== 'undefined') {
  const shutdown = () => {
    stopScheduler();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('beforeExit', shutdown);
}
