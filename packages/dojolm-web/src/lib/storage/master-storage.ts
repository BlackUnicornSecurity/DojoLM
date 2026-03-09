/**
 * File: master-storage.ts
 * Purpose: File-based storage for Amaterasu DNA master-tier threat entries
 * Story: KASHIWA-9.3
 * Pattern: Follows ecosystem-storage.ts (gold standard)
 * Index:
 * - PATHS / Constants (line 15)
 * - readJSON / writeJSON (line 28)
 * - ID validation (line 53)
 * - Entry Index (line 70)
 * - Entry CRUD (line 85)
 * - Sync Config (line 155)
 * - Sync History (line 175)
 * - Auto-rotation (in saveEntry)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { MasterThreatEntry, MasterSyncConfig, MasterSyncResult } from 'bu-tpi/attackdna';

// ===========================================================================
// Constants & Paths
// ===========================================================================

const MASTER_MAX_ENTRIES = 50_000;
const MASTER_MAX_QUERY_LIMIT = 500;
const MASTER_MAX_SYNC_HISTORY = 100;
const DATA_BASE_DIR = path.join(process.cwd(), 'data', 'amaterasu-master');

const PATHS = {
  entries: path.join(DATA_BASE_DIR, 'entries'),
  entryIndex: path.join(DATA_BASE_DIR, 'entries', 'index.json'),
  syncConfig: path.join(DATA_BASE_DIR, 'sync-config.json'),
  syncHistory: path.join(DATA_BASE_DIR, 'sync-history.json'),
} as const;

// ===========================================================================
// File I/O (atomic write pattern — matches ecosystem-storage.ts)
// ===========================================================================

async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code !== 'EEXIST') throw error;
  }

  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

// ===========================================================================
// ID Validation (matches ecosystem-storage.ts safeResolve* pattern)
// ===========================================================================

/** Path-safe ID validation — only alphanumeric, dash, underscore */
function isValidEntryId(id: string): boolean {
  return id.length > 0 && id.length <= 256 && /^[\w-]+$/.test(id);
}

/** Resolve an entry file path safely, or return null on traversal attempt */
function safeResolveEntry(id: string): string | null {
  if (!isValidEntryId(id)) return null;
  const resolved = path.resolve(PATHS.entries, `${id}.json`);
  if (!resolved.startsWith(path.resolve(PATHS.entries) + path.sep)) return null;
  return resolved;
}

// ===========================================================================
// Index Management
// ===========================================================================

interface EntryIndex {
  ids: string[];
  totalCount: number;
}

async function getEntryIndex(): Promise<EntryIndex> {
  const raw = await readJSON<EntryIndex>(PATHS.entryIndex);
  if (!raw) return { ids: [], totalCount: 0 };
  return { ids: raw.ids ?? [], totalCount: raw.ids?.length ?? 0 };
}

// ===========================================================================
// Entry CRUD
// ===========================================================================

export interface EntryFilter {
  category?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  sourceId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function saveEntry(entry: MasterThreatEntry): Promise<MasterThreatEntry> {
  if (!entry.id || typeof entry.id !== 'string') throw new Error('Invalid entry: missing id');
  if (!isValidEntryId(entry.id)) throw new Error('Invalid entry: invalid id format');

  const entryPath = safeResolveEntry(entry.id);
  if (!entryPath) throw new Error('Invalid entry: invalid id format');
  await writeJSON(entryPath, entry);

  const index = await getEntryIndex();
  if (!index.ids.includes(entry.id)) {
    index.ids.push(entry.id);
    index.totalCount = index.ids.length;
  }

  // Auto-rotation: remove oldest if over limit
  if (index.ids.length > MASTER_MAX_ENTRIES) {
    const toRemove = index.ids.splice(0, index.ids.length - MASTER_MAX_ENTRIES);
    for (const oldId of toRemove) {
      const oldPath = safeResolveEntry(oldId);
      if (oldPath) {
        try { await fs.unlink(oldPath); } catch { /* ignore cleanup failures */ }
      }
    }
    index.totalCount = index.ids.length;
  }

  await writeJSON(PATHS.entryIndex, index);
  return entry;
}

export async function getEntry(id: string): Promise<MasterThreatEntry | null> {
  const resolved = safeResolveEntry(id);
  if (!resolved) return null;
  return readJSON<MasterThreatEntry>(resolved);
}

export async function queryEntries(
  filter: EntryFilter = {}
): Promise<{ entries: MasterThreatEntry[]; total: number }> {
  const index = await getEntryIndex();
  const results: MasterThreatEntry[] = [];
  const reversed = [...index.ids].reverse();

  for (const entryId of reversed) {
    const entryPath = safeResolveEntry(entryId);
    if (!entryPath) continue;

    const entry = await readJSON<MasterThreatEntry>(entryPath);
    if (!entry) continue;

    if (filter.category && entry.category !== filter.category) continue;
    if (filter.severity && entry.severity !== filter.severity) continue;
    if (filter.sourceId && entry.sourceId !== filter.sourceId) continue;
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      const haystack = `${entry.title} ${entry.description}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
    }

    results.push(entry);
  }

  const total = results.length;
  const offset = filter.offset || 0;
  const limit = Math.min(filter.limit || 25, MASTER_MAX_QUERY_LIMIT);

  return {
    entries: results.slice(offset, offset + limit),
    total,
  };
}

export async function deleteEntry(id: string): Promise<boolean> {
  const resolved = safeResolveEntry(id);
  if (!resolved) return false;

  try {
    await fs.unlink(resolved);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }

  const index = await getEntryIndex();
  index.ids = index.ids.filter((eid) => eid !== id);
  index.totalCount = index.ids.length;
  await writeJSON(PATHS.entryIndex, index);

  return true;
}

// ===========================================================================
// Sync Config
// ===========================================================================

const DEFAULT_SYNC_CONFIG: MasterSyncConfig = {
  syncSchedule: '0 */6 * * *',
  enabledSources: [],
  lastSyncAt: null,
  autoSyncEnabled: false,
};

export async function getSyncConfig(): Promise<MasterSyncConfig> {
  return (await readJSON<MasterSyncConfig>(PATHS.syncConfig)) ?? DEFAULT_SYNC_CONFIG;
}

export async function saveSyncConfig(config: MasterSyncConfig): Promise<void> {
  await writeJSON(PATHS.syncConfig, config);
}

// ===========================================================================
// Sync History
// ===========================================================================

export async function getSyncHistory(limit = 20): Promise<MasterSyncResult[]> {
  const history = (await readJSON<MasterSyncResult[]>(PATHS.syncHistory)) ?? [];
  const cappedLimit = Math.min(Math.max(1, limit), MASTER_MAX_SYNC_HISTORY);
  return history.slice(-cappedLimit);
}

export async function addSyncResult(result: MasterSyncResult): Promise<void> {
  const history = (await readJSON<MasterSyncResult[]>(PATHS.syncHistory)) ?? [];
  history.push(result);

  // Cap history length
  const trimmed = history.length > MASTER_MAX_SYNC_HISTORY
    ? history.slice(-MASTER_MAX_SYNC_HISTORY)
    : history;

  await writeJSON(PATHS.syncHistory, trimmed);
}
