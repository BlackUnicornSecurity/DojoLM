/**
 * File: master-sync-scheduler.test.ts
 * Tests for: src/lib/master-sync-scheduler.ts
 * Story: KASHIWA-11.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/storage/master-storage', () => ({
  getSyncConfig: vi.fn(),
  saveSyncConfig: vi.fn().mockResolvedValue(undefined),
  queryEntries: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
  saveEntry: vi.fn().mockResolvedValue(undefined),
  addSyncResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bu-tpi/attackdna', () => ({
  syncAllSources: vi.fn().mockResolvedValue({
    entries: [],
    syncResult: {
      syncedAt: '2026-03-10T00:00:00.000Z',
      sourcesProcessed: 0,
      entriesFetched: 0,
      entriesAfterDedup: 0,
      entriesClassified: 0,
      errors: [],
    },
  }),
  convertToAttackNodes: vi.fn().mockReturnValue([]),
  getAvailableSourceIds: vi.fn().mockReturnValue(['source-a', 'source-b']),
}));

vi.mock('@/lib/storage/dna-storage', () => ({
  saveNode: vi.fn().mockResolvedValue(undefined),
}));

import * as masterStorage from '@/lib/storage/master-storage';
import { syncAllSources, convertToAttackNodes } from 'bu-tpi/attackdna';
import * as dnaStorage from '@/lib/storage/dna-storage';
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
} from '../master-sync-scheduler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockConfig(overrides: Partial<{
  syncSchedule: string;
  enabledSources: string[];
  lastSyncAt: string | null;
  autoSyncEnabled: boolean;
}> = {}) {
  const config = {
    syncSchedule: 'daily',
    enabledSources: [],
    lastSyncAt: null,
    autoSyncEnabled: true,
    ...overrides,
  };
  vi.mocked(masterStorage.getSyncConfig).mockResolvedValue(config);
  return config;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('master-sync-scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Ensure scheduler is stopped between tests
    stopScheduler();
  });

  afterEach(() => {
    stopScheduler();
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // startScheduler
  // -----------------------------------------------------------------------

  it('MSS-001: should return true when autoSync is enabled with valid schedule', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily' });

    const result = await startScheduler();

    expect(result).toBe(true);
  });

  it('MSS-002: should return false when autoSync is disabled', async () => {
    mockConfig({ autoSyncEnabled: false });

    const result = await startScheduler();

    expect(result).toBe(false);
  });

  it('MSS-003: should return false when schedule is manual', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'manual' });

    const result = await startScheduler();

    expect(result).toBe(false);
  });

  it('MSS-004: should return false when schedule is unrecognized', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'every-5-minutes' });

    const result = await startScheduler();

    expect(result).toBe(false);
  });

  it('MSS-005: should accept weekly schedule', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'weekly' });

    const result = await startScheduler();

    expect(result).toBe(true);
  });

  it('MSS-006: should accept monthly schedule', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'monthly' });

    const result = await startScheduler();

    expect(result).toBe(true);
  });

  // -----------------------------------------------------------------------
  // stopScheduler
  // -----------------------------------------------------------------------

  it('MSS-007: stopScheduler sets running to false', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily' });
    await startScheduler();
    expect(getSchedulerStatus().running).toBe(true);

    stopScheduler();

    expect(getSchedulerStatus().running).toBe(false);
  });

  it('MSS-008: stopScheduler is safe to call when not running', () => {
    // Should not throw
    expect(() => stopScheduler()).not.toThrow();
    expect(getSchedulerStatus().running).toBe(false);
  });

  // -----------------------------------------------------------------------
  // getSchedulerStatus
  // -----------------------------------------------------------------------

  it('MSS-009: getSchedulerStatus returns correct shape', () => {
    const status = getSchedulerStatus();

    expect(status).toHaveProperty('running');
    expect(status).toHaveProperty('lastScheduledSync');
    expect(typeof status.running).toBe('boolean');
    expect(status.running).toBe(false);
    // lastScheduledSync is null initially or a string after a sync has run
    expect(status.lastScheduledSync === null || typeof status.lastScheduledSync === 'string').toBe(true);
  });

  it('MSS-010: getSchedulerStatus shows running after start', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily' });
    await startScheduler();

    const status = getSchedulerStatus();

    expect(status.running).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Scheduled sync execution (interval fires)
  // -----------------------------------------------------------------------

  it('MSS-011: interval fires and runs the full sync pipeline', async () => {
    const fakeEntry = {
      id: 'e-1',
      source: 'source-a',
      category: 'malware',
      severity: 'high',
      techniqueIds: ['T1059'],
      indicators: ['ioc-1'],
      rawContent: 'test content',
      firstSeen: '2026-03-10T00:00:00.000Z',
      lastUpdated: '2026-03-10T00:00:00.000Z',
      metadata: {},
    };
    const fakeSyncResult = {
      syncedAt: '2026-03-10T12:00:00.000Z',
      sourcesProcessed: 1,
      entriesFetched: 1,
      entriesAfterDedup: 1,
      entriesClassified: 1,
      errors: [],
    };
    const fakeNode = { id: 'n-1', content: 'test', category: 'malware', severity: 'high' };

    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily', enabledSources: ['source-a'] });
    vi.mocked(syncAllSources).mockResolvedValueOnce({
      entries: [fakeEntry as never],
      syncResult: fakeSyncResult,
    });
    vi.mocked(convertToAttackNodes).mockReturnValueOnce([fakeNode as never]);

    await startScheduler();

    // Advance past one daily interval (24h)
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    // syncAllSources called once from the interval callback
    expect(syncAllSources).toHaveBeenCalledWith(['source-a'], expect.any(Array));
    expect(masterStorage.saveEntry).toHaveBeenCalledWith(fakeEntry);
    expect(convertToAttackNodes).toHaveBeenCalledWith([fakeEntry]);
    expect(dnaStorage.saveNode).toHaveBeenCalledWith(fakeNode);
    expect(masterStorage.saveSyncConfig).toHaveBeenCalledWith(
      expect.objectContaining({ lastSyncAt: '2026-03-10T12:00:00.000Z' }),
    );
    expect(masterStorage.addSyncResult).toHaveBeenCalledWith(fakeSyncResult);
  });

  it('MSS-012: sync pipeline uses getAvailableSourceIds when enabledSources is empty', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily', enabledSources: [] });

    await startScheduler();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    // Should fall through to getAvailableSourceIds result
    expect(syncAllSources).toHaveBeenCalledWith(
      expect.arrayContaining(['source-a', 'source-b']),
      expect.any(Array),
    );
  });

  it('MSS-013: sync error does not crash the scheduler', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(syncAllSources).mockRejectedValueOnce(new Error('network down'));

    await startScheduler();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    // Scheduler should still be running after error
    expect(getSchedulerStatus().running).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[MasterSyncScheduler]'),
      'network down',
    );

    consoleSpy.mockRestore();
  });

  it('MSS-014: starting scheduler twice stops the first interval', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily' });

    await startScheduler();
    await startScheduler();

    // Advance one daily interval
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    // syncAllSources should be called exactly once (only from the second interval)
    expect(syncAllSources).toHaveBeenCalledTimes(1);
  });

  it('MSS-015: lastScheduledSync is updated after a successful sync', async () => {
    const syncTime = '2026-03-10T18:00:00.000Z';
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily' });
    vi.mocked(syncAllSources).mockResolvedValueOnce({
      entries: [],
      syncResult: {
        syncedAt: syncTime,
        sourcesProcessed: 0,
        entriesFetched: 0,
        entriesAfterDedup: 0,
        entriesClassified: 0,
        errors: [],
      },
    });

    await startScheduler();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(getSchedulerStatus().lastScheduledSync).toBe(syncTime);
  });

  it('MSS-016: weekly interval fires at 7-day mark, not before', async () => {
    mockConfig({ autoSyncEnabled: true, syncSchedule: 'weekly' });

    await startScheduler();

    // Advance 6 days — should NOT have fired
    await vi.advanceTimersByTimeAsync(6 * 24 * 60 * 60 * 1000);
    expect(syncAllSources).not.toHaveBeenCalled();

    // Advance remaining 1 day to hit 7 days total
    await vi.advanceTimersByTimeAsync(1 * 24 * 60 * 60 * 1000);
    expect(syncAllSources).toHaveBeenCalledTimes(1);
  });

  it('MSS-017: stores multiple new entries and nodes from sync', async () => {
    const entries = [
      { id: 'e-1', rawContent: 'a', category: 'malware', severity: 'high' },
      { id: 'e-2', rawContent: 'b', category: 'phishing', severity: 'medium' },
      { id: 'e-3', rawContent: 'c', category: 'exploit', severity: 'critical' },
    ];
    const nodes = [
      { id: 'n-1' },
      { id: 'n-2' },
      { id: 'n-3' },
    ];

    mockConfig({ autoSyncEnabled: true, syncSchedule: 'daily' });
    vi.mocked(syncAllSources).mockResolvedValueOnce({
      entries: entries as never[],
      syncResult: {
        syncedAt: '2026-03-10T00:00:00.000Z',
        sourcesProcessed: 1,
        entriesFetched: 3,
        entriesAfterDedup: 3,
        entriesClassified: 3,
        errors: [],
      },
    });
    vi.mocked(convertToAttackNodes).mockReturnValueOnce(nodes as never[]);

    await startScheduler();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(masterStorage.saveEntry).toHaveBeenCalledTimes(3);
    expect(dnaStorage.saveNode).toHaveBeenCalledTimes(3);
  });
});
