/**
 * File: guard-storage.ts
 * Purpose: File-based storage for Hattori Guard config, events, and stats
 * Story: TPI-UIP-11
 * Index:
 * - PATHS (line 24)
 * - HMAC signing (line 34)
 * - readJSON / writeJSON (line 60)
 * - saveGuardConfig() (line 93)
 * - getGuardConfig() (line 120)
 * - saveGuardEvent() (line 154)
 * - queryGuardEvents() (line 207)
 * - getGuardStats() (line 253)
 * - getConfigHash() (line 306)
 * - clearOldEvents() (line 316)
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  GuardConfig,
  SignedGuardConfig,
  GuardEvent,
  GuardAuditEntry,
  GuardAuditQuery,
  GuardStats,
  GuardAction,
  GuardDirection,
  GuardMode,
} from '../guard-types';
import { DEFAULT_GUARD_CONFIG, GUARD_MAX_EVENTS } from '../guard-constants';
// ===========================================================================
// Mode Migration (backward compat: old→new mode names)
// Only truly obsolete names are mapped — current valid names must NOT appear as keys.
// ===========================================================================

const OLD_TO_NEW_MODE: Record<string, GuardMode> = {
  metsuke: 'shinobi',
  ninja: 'samurai',
};

const VALID_NEW_MODES = new Set<string>(['shinobi', 'samurai', 'sensei', 'hattori']);

/** Normalize a mode name — accepts old names for backward compat, returns new name.
 *  Returns 'shinobi' (default) for unknown/corrupted mode values. */
function normalizeMode(mode: string): GuardMode {
  const mapped = OLD_TO_NEW_MODE[mode];
  if (mapped) return mapped;
  if (VALID_NEW_MODES.has(mode)) return mode as GuardMode;
  console.warn(`Unknown guard mode in persisted data: ${mode}, defaulting to shinobi`);
  return 'shinobi';
}

// ===========================================================================
// Paths
// ===========================================================================

const DATA_BASE_DIR = path.join(process.cwd(), 'data', 'llm-results', 'guard');

const PATHS = {
  config: path.join(DATA_BASE_DIR, 'config.json'),
  index: path.join(DATA_BASE_DIR, 'index.json'),
  events: path.join(DATA_BASE_DIR, 'events'),
} as const;

// ===========================================================================
// HMAC Signing (S1)
// ===========================================================================

function getHmacSecret(): string {
  const secret = process.env.GUARD_CONFIG_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('GUARD_CONFIG_SECRET must be set in production');
    }
    console.warn('[SECURITY] GUARD_CONFIG_SECRET not set — using insecure default. Set this in .env.local.');
    return 'dojolm-guard-dev-only-secret';
  }
  return secret;
}

function signConfig(config: GuardConfig, timestamp: number): string {
  const hmac = crypto.createHmac('sha256', getHmacSecret());
  hmac.update(JSON.stringify({ config, timestamp }));
  return hmac.digest('hex');
}

const MAX_CONFIG_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function verifyConfigSignature(signed: SignedGuardConfig): boolean {
  // Reject configs older than MAX_CONFIG_AGE_MS (replay protection)
  if (Date.now() - signed.timestamp > MAX_CONFIG_AGE_MS) {
    console.warn('Guard config rejected: timestamp too old (possible replay)');
    return false;
  }
  const expected = signConfig(signed.config, signed.timestamp);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signed.signature, 'hex')
    );
  } catch {
    return false;
  }
}

// ===========================================================================
// File I/O (follows file-storage.ts atomic write pattern)
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

  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

// ===========================================================================
// Config Management
// ===========================================================================

interface EventIndex {
  eventIds: string[];
  latestHash?: string;
}

/**
 * Save guard config with HMAC signature (S1).
 * Config change is also logged as an audit event (S7).
 */
export async function saveGuardConfig(config: GuardConfig): Promise<void> {
  const timestamp = Date.now();
  const signature = signConfig(config, timestamp);
  const signed: SignedGuardConfig = {
    config,
    signature,
    timestamp,
  };

  await writeJSON(PATHS.config, signed);

  // Log config change as audit event (S7)
  const configChangeEvent: GuardEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    mode: config.mode,
    direction: 'input',
    scanResult: null,
    action: 'log',
    scannedText: `[CONFIG CHANGE] Mode: ${config.mode}, Enabled: ${config.enabled}, Threshold: ${config.blockThreshold}`,
    confidence: 0,
  };

  await saveGuardEvent(configChangeEvent);
}

/**
 * Load guard config, verify HMAC signature (S1).
 * Returns DEFAULT_GUARD_CONFIG if no config exists or signature is invalid.
 * Migrates old mode names (metsuke→shinobi, etc.) on read.
 */
export async function getGuardConfig(): Promise<GuardConfig> {
  const signed = await readJSON<SignedGuardConfig>(PATHS.config);

  if (!signed) {
    return { ...DEFAULT_GUARD_CONFIG };
  }

  // Verify HMAC signature
  if (!verifyConfigSignature(signed)) {
    console.error('Guard config HMAC verification failed — config may be tampered');
    return { ...DEFAULT_GUARD_CONFIG };
  }

  const config = signed.config;

  // Migrate old mode name if needed (backward compat)
  if (OLD_TO_NEW_MODE[config.mode]) {
    config.mode = normalizeMode(config.mode);
    // Re-save with new mode name so migration is persisted
    await saveGuardConfig(config);
  }

  return config;
}

// ===========================================================================
// Event Management
// ===========================================================================

/**
 * Save a guard event with chain integrity (S2).
 * Uses atomic write (temp+rename) and caps event index at GUARD_MAX_EVENTS.
 */
export async function saveGuardEvent(event: GuardEvent): Promise<GuardAuditEntry> {
  // Read current index
  const index = (await readJSON<EventIndex>(PATHS.index)) || { eventIds: [] };

  // Chain integrity: compute content hash including previous link (S2)
  const partial = {
    ...event,
    previousEventHash: index.latestHash,
  };
  const contentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(partial))
    .digest('hex');

  const auditEntry: GuardAuditEntry = {
    ...partial,
    contentHash,
  };

  // Write event file
  const eventPath = path.join(PATHS.events, `${event.id}.json`);
  await writeJSON(eventPath, auditEntry);

  // Update index (cap at GUARD_MAX_EVENTS)
  index.eventIds.push(event.id);
  if (index.eventIds.length > GUARD_MAX_EVENTS) {
    // Remove oldest events
    const toRemove = index.eventIds.splice(0, index.eventIds.length - GUARD_MAX_EVENTS);
    // Best-effort cleanup of old event files
    for (const oldId of toRemove) {
      try {
        await fs.unlink(path.join(PATHS.events, `${oldId}.json`));
      } catch {
        // Ignore cleanup failures
      }
    }
  }

  index.latestHash = contentHash;
  await writeJSON(PATHS.index, index);

  return auditEntry;
}

/**
 * Query guard events with optional filters and pagination.
 */
export async function queryGuardEvents(
  query: GuardAuditQuery = {}
): Promise<{ events: GuardAuditEntry[]; total: number }> {
  const index = (await readJSON<EventIndex>(PATHS.index)) || { eventIds: [] };

  // Load events in reverse order (newest first)
  const allEvents: GuardAuditEntry[] = [];
  const reversed = [...index.eventIds].reverse();

  for (const eventId of reversed) {
    const event = await readJSON<GuardAuditEntry>(
      path.join(PATHS.events, `${eventId}.json`)
    );
    if (!event) continue;

    // Apply filters (normalize old mode names for backward compat)
    if (query.mode && normalizeMode(event.mode) !== query.mode) continue;
    if (query.direction && event.direction !== query.direction) continue;
    if (query.action && event.action !== query.action) continue;
    if (query.modelConfigId && event.modelConfigId !== query.modelConfigId) continue;
    if (query.startDate && event.timestamp < query.startDate) continue;
    if (query.endDate && event.timestamp > query.endDate) continue;

    allEvents.push(event);
  }

  const total = allEvents.length;
  const offset = query.offset || 0;
  const limit = query.limit || 25;

  return {
    events: allEvents.slice(offset, offset + limit),
    total,
  };
}

/**
 * Get aggregated guard statistics.
 */
export async function getGuardStats(): Promise<GuardStats> {
  const index = (await readJSON<EventIndex>(PATHS.index)) || { eventIds: [] };

  const stats: GuardStats = {
    totalEvents: 0,
    byAction: { allow: 0, block: 0, log: 0 },
    byDirection: { input: 0, output: 0 },
    byMode: { shinobi: 0, samurai: 0, sensei: 0, hattori: 0 },
    blockRate: 0,
    recentTimestamps: [],
    topCategories: [],
  };

  const categoryMap = new Map<string, number>();
  const recentIds = index.eventIds.slice(-100); // Last 100 events for stats

  for (const eventId of recentIds) {
    const event = await readJSON<GuardAuditEntry>(
      path.join(PATHS.events, `${eventId}.json`)
    );
    if (!event) continue;

    stats.totalEvents++;
    stats.byAction[event.action as GuardAction]++;
    stats.byDirection[event.direction as GuardDirection]++;
    // Normalize old mode names in existing events for correct aggregation
    const normalizedMode = normalizeMode(event.mode);
    stats.byMode[normalizedMode]++;
    stats.recentTimestamps.push(event.timestamp);

    // Track finding categories
    if (event.scanResult && event.scanResult.findings > 0 && event.scanResult.severity) {
      const key = event.scanResult.severity;
      categoryMap.set(key, (categoryMap.get(key) || 0) + 1);
    }
  }

  // Use total from index, not just recent 100
  stats.totalEvents = index.eventIds.length;

  // Calculate block rate
  const actionTotal = stats.byAction.allow + stats.byAction.block + stats.byAction.log;
  stats.blockRate = actionTotal > 0
    ? Math.round((stats.byAction.block / actionTotal) * 100)
    : 0;

  // Build top categories
  stats.topCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return stats;
}

/**
 * Get SHA-256 hash of guard config for cache key inclusion (S3).
 */
export function getConfigHash(config: GuardConfig): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(config))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Remove events older than retentionDays.
 */
export async function clearOldEvents(retentionDays: number): Promise<number> {
  const index = (await readJSON<EventIndex>(PATHS.index)) || { eventIds: [] };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString();

  let removed = 0;
  const remaining: string[] = [];

  for (const eventId of index.eventIds) {
    const event = await readJSON<GuardAuditEntry>(
      path.join(PATHS.events, `${eventId}.json`)
    );

    if (!event || event.timestamp < cutoffStr) {
      try {
        await fs.unlink(path.join(PATHS.events, `${eventId}.json`));
      } catch {
        // Ignore
      }
      removed++;
    } else {
      remaining.push(eventId);
    }
  }

  index.eventIds = remaining;
  await writeJSON(PATHS.index, index);

  return removed;
}
