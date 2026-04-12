/**
 * File: guard-storage.ts
 * Purpose: File-based storage for Hattori Guard config, events, and stats
 * Story: TPI-UIP-11
 * Index:
 * - PATHS + path traversal validation (line 24)
 * - HMAC signing (line 50)
 * - readJSON / writeJSON (line 78)
 * - saveGuardConfig() (line 111)
 * - getGuardConfig() (line 138)
 * - saveGuardEvent() (line 172)
 * - queryGuardEvents() (line 227)
 * - getGuardStats() (line 275)
 * - getConfigHash() (line 330)
 * - clearOldEvents() (line 340)
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
import { getDataPath } from '@/lib/runtime-paths';
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

const DATA_BASE_DIR = getDataPath('llm-results', 'guard');

const PATHS = {
  config: path.join(DATA_BASE_DIR, 'config.json'),
  index: path.join(DATA_BASE_DIR, 'index.json'),
  events: path.join(DATA_BASE_DIR, 'events'),
} as const;

// ===========================================================================
// Path Traversal Validation (R2-C4 fix — matches ecosystem-storage.ts pattern)
// ===========================================================================

/** Path-safe ID validation — only alphanumeric, dash, underscore */
function isValidEventId(id: string): boolean {
  return id.length > 0 && id.length <= 128 && /^[\w-]+$/.test(id);
}

/** Resolve an event file path safely, or return null on traversal attempt */
function safeResolveEvent(id: string): string | null {
  if (!isValidEventId(id)) return null;
  const resolved = path.resolve(PATHS.events, `${id}.json`);
  if (!resolved.startsWith(path.resolve(PATHS.events) + path.sep)) return null;
  return resolved;
}


// ===========================================================================
// HMAC Signing (S1)
// ===========================================================================

export class GuardConfigSecretMissingError extends Error {
  readonly code = 'GUARD_CONFIG_SECRET_MISSING';
  constructor() { super('GUARD_CONFIG_SECRET must be set in production'); }
}

function getHmacSecret(): string {
  const secret = process.env.GUARD_CONFIG_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new GuardConfigSecretMissingError();
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

  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
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

  // Verify HMAC signature (BUG-007: surface failure clearly)
  if (!verifyConfigSignature(signed)) {
    console.error('[Guard] HMAC verification FAILED — returning default config (guard disabled). ' +
      'Fix: re-save guard config with correct GUARD_CONFIG_SECRET or delete config.json to reset.');
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
  // Fire-and-forget: emit ecosystem finding on block action (Story 10.4)
  if (event.action === 'block') {
    try {
      const { emitGuardFinding } = await import('../ecosystem-emitters');
      emitGuardFinding({
        mode: event.mode,
        direction: event.direction,
        action: event.action,
        findings: event.scanResult ? [{ severity: event.scanResult.severity || undefined }] : [],
        content: event.scannedText,
      });
    } catch {
      // Fire-and-forget — ignore emission failures
    }
  }

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

  // Write event file (path traversal protection)
  const eventPath = safeResolveEvent(event.id);
  if (!eventPath) throw new Error('Invalid event: Invalid id format');
  await writeJSON(eventPath, auditEntry);

  // Update index (cap at GUARD_MAX_EVENTS)
  index.eventIds.push(event.id);
  if (index.eventIds.length > GUARD_MAX_EVENTS) {
    // Remove oldest events
    const toRemove = index.eventIds.splice(0, index.eventIds.length - GUARD_MAX_EVENTS);
    // Best-effort cleanup of old event files (path traversal protection)
    for (const oldId of toRemove) {
      const oldPath = safeResolveEvent(oldId);
      if (!oldPath) continue;
      try {
        await fs.unlink(oldPath);
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
    // Sanitize index-sourced IDs before path construction
    const eventPath = safeResolveEvent(eventId);
    if (!eventPath) continue;
    const event = await readJSON<GuardAuditEntry>(eventPath);
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
    // Sanitize index-sourced IDs before path construction
    const eventPath = safeResolveEvent(eventId);
    if (!eventPath) continue;
    const event = await readJSON<GuardAuditEntry>(eventPath);
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

// ===========================================================================
// Chain Integrity Verification (LOGIC-05 fix)
// ===========================================================================

export interface ChainVerificationResult {
  valid: boolean;
  totalEvents: number;
  verifiedEvents: number;
  brokenLinks: Array<{
    eventId: string;
    index: number;
    reason: 'missing_file' | 'content_hash_mismatch' | 'chain_link_mismatch';
    expected?: string;
    actual?: string;
  }>;
}

/**
 * Verify the integrity of the guard audit event chain.
 * Walks all events in order and validates:
 * 1. Each event file exists and is readable
 * 2. Each event's contentHash matches the recomputed hash of its content
 * 3. Each event's previousEventHash matches the prior event's contentHash
 */
export async function verifyChain(): Promise<ChainVerificationResult> {
  const index = (await readJSON<EventIndex>(PATHS.index)) || { eventIds: [] };

  const result: ChainVerificationResult = {
    valid: true,
    totalEvents: index.eventIds.length,
    verifiedEvents: 0,
    brokenLinks: [],
  };

  let previousHash: string | undefined;

  for (let i = 0; i < index.eventIds.length; i++) {
    const eventId = index.eventIds[i];
    const eventPath = safeResolveEvent(eventId);
    if (!eventPath) continue;

    const event = await readJSON<GuardAuditEntry>(eventPath);
    if (!event) {
      result.valid = false;
      result.brokenLinks.push({
        eventId,
        index: i,
        reason: 'missing_file',
      });
      // Chain is broken — subsequent previousEventHash checks are meaningless
      // but we continue to report all gaps
      previousHash = undefined;
      continue;
    }

    // Verify contentHash: recompute from event data using the same approach as
    // saveGuardEvent() — spread all fields except contentHash itself.
    // Must match line 262-268: { ...event, previousEventHash: ... }
    const { contentHash: _storedHash, ...eventWithoutHash } = event;
    const recomputedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(eventWithoutHash))
      .digest('hex');

    if (event.contentHash !== recomputedHash) {
      result.valid = false;
      result.brokenLinks.push({
        eventId,
        index: i,
        reason: 'content_hash_mismatch',
        expected: recomputedHash,
        actual: event.contentHash,
      });
    }

    // Verify chain link: previousEventHash should match the prior event's contentHash
    if (previousHash !== undefined && event.previousEventHash !== previousHash) {
      result.valid = false;
      result.brokenLinks.push({
        eventId,
        index: i,
        reason: 'chain_link_mismatch',
        expected: previousHash,
        actual: event.previousEventHash,
      });
    }

    previousHash = event.contentHash;
    result.verifiedEvents++;
  }

  return result;
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
    // Sanitize index-sourced IDs before path construction
    const eventPath = safeResolveEvent(eventId);
    if (!eventPath) continue;

    const event = await readJSON<GuardAuditEntry>(eventPath);

    if (!event || event.timestamp < cutoffStr) {
      try {
        await fs.unlink(eventPath);
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
