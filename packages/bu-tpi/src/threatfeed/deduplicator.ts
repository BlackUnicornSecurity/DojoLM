/**
 * S61: THREATFEED Deduplicator
 * Prevents duplicate intelligence items using content hashing and similarity.
 */

import { createHash } from 'crypto';
import type { ThreatEntry } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

export interface ThreatDeduplicator {
  readonly windowMs: number;
  readonly hashes: Map<string, number>; // hash -> timestamp
  readonly stats: { total: number; unique: number; duplicates: number };
}

/**
 * Create a deduplicator with a time window.
 */
export function createDeduplicator(windowMs: number = 3600_000): ThreatDeduplicator {
  return {
    windowMs,
    hashes: new Map(),
    stats: { total: 0, unique: 0, duplicates: 0 },
  };
}

/**
 * Compute a content hash for deduplication.
 */
function computeHash(entry: ThreatEntry): string {
  const content = `${entry.title}|${entry.rawContent}`.toLowerCase().trim();
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Check if an entry is a duplicate within the dedup window.
 */
export function isDuplicate(
  dedup: ThreatDeduplicator,
  entry: ThreatEntry
): boolean {
  if (entry.rawContent.length > MAX_INPUT_LENGTH) return false;

  const hash = computeHash(entry);
  const now = Date.now();

  // Clean expired entries
  for (const [h, ts] of dedup.hashes) {
    if (now - ts > dedup.windowMs) {
      dedup.hashes.delete(h);
    }
  }

  (dedup.stats as { total: number }).total++;

  if (dedup.hashes.has(hash)) {
    (dedup.stats as { duplicates: number }).duplicates++;
    return true;
  }

  return false;
}

/**
 * Add an entry to the dedup tracking.
 */
export function addEntry(dedup: ThreatDeduplicator, entry: ThreatEntry): void {
  if (entry.rawContent.length > MAX_INPUT_LENGTH) return;

  const hash = computeHash(entry);
  dedup.hashes.set(hash, Date.now());
  (dedup.stats as { unique: number }).unique++;
}

/**
 * Get deduplication statistics.
 */
export function getDeduplicatorStats(dedup: ThreatDeduplicator): {
  total: number;
  unique: number;
  duplicates: number;
  activeHashes: number;
} {
  return {
    ...dedup.stats,
    activeHashes: dedup.hashes.size,
  };
}

/**
 * Clear the deduplicator state.
 */
export function clearDeduplicator(dedup: ThreatDeduplicator): void {
  dedup.hashes.clear();
  (dedup.stats as { total: number; unique: number; duplicates: number }).total = 0;
  (dedup.stats as { total: number; unique: number; duplicates: number }).unique = 0;
  (dedup.stats as { total: number; unique: number; duplicates: number }).duplicates = 0;
}
