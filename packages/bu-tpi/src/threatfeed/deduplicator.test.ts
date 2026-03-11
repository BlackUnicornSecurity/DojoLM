/**
 * Deduplicator Tests
 * Tests for: createDeduplicator, isDuplicate, addEntry,
 * getDeduplicatorStats, clearDeduplicator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDeduplicator,
  isDuplicate,
  addEntry,
  getDeduplicatorStats,
  clearDeduplicator,
} from './deduplicator.js';
import type { ThreatDeduplicator } from './deduplicator.js';
import type { ThreatEntry } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

function makeEntry(overrides: Partial<ThreatEntry> = {}): ThreatEntry {
  return {
    id: 'entry-1',
    sourceId: 'src-1',
    title: 'Test Threat',
    description: 'A test threat',
    rawContent: 'This is raw content for testing',
    classifiedType: null,
    severity: null,
    confidence: 0,
    indicators: [],
    extractedPatterns: [],
    createdAt: new Date().toISOString(),
    processedAt: null,
    ...overrides,
  };
}

describe('Deduplicator', () => {
  let dedup: ThreatDeduplicator;

  beforeEach(() => {
    dedup = createDeduplicator();
  });

  // DD-001
  it('DD-001: createDeduplicator creates instance with default window', () => {
    expect(dedup.windowMs).toBe(3600_000);
    expect(dedup.hashes.size).toBe(0);
    expect(dedup.stats.total).toBe(0);
    expect(dedup.stats.unique).toBe(0);
    expect(dedup.stats.duplicates).toBe(0);
  });

  // DD-002
  it('DD-002: createDeduplicator accepts custom window', () => {
    const custom = createDeduplicator(60_000);
    expect(custom.windowMs).toBe(60_000);
  });

  // DD-003
  it('DD-003: isDuplicate returns false for new entries', () => {
    const entry = makeEntry();
    expect(isDuplicate(dedup, entry)).toBe(false);
  });

  // DD-004
  it('DD-004: isDuplicate returns true for previously added entries', () => {
    const entry = makeEntry();
    addEntry(dedup, entry);
    expect(isDuplicate(dedup, entry)).toBe(true);
  });

  // DD-005
  it('DD-005: isDuplicate returns false for entries with different content', () => {
    const entry1 = makeEntry({ title: 'Title A', rawContent: 'Content A' });
    const entry2 = makeEntry({ title: 'Title B', rawContent: 'Content B' });
    addEntry(dedup, entry1);
    expect(isDuplicate(dedup, entry2)).toBe(false);
  });

  // DD-006
  it('DD-006: isDuplicate returns false for oversized content', () => {
    const entry = makeEntry({ rawContent: 'x'.repeat(MAX_INPUT_LENGTH + 1) });
    expect(isDuplicate(dedup, entry)).toBe(false);
  });

  // DD-007
  it('DD-007: addEntry does not add oversized content', () => {
    const entry = makeEntry({ rawContent: 'x'.repeat(MAX_INPUT_LENGTH + 1) });
    addEntry(dedup, entry);
    expect(dedup.hashes.size).toBe(0);
  });

  // DD-008
  it('DD-008: isDuplicate increments total and duplicate stats', () => {
    const entry = makeEntry();
    addEntry(dedup, entry);
    isDuplicate(dedup, entry);
    expect(dedup.stats.total).toBe(1);
    expect(dedup.stats.duplicates).toBe(1);
  });

  // DD-009
  it('DD-009: isDuplicate cleans expired entries from the window', () => {
    const entry1 = makeEntry({ title: 'Old', rawContent: 'Old content' });
    addEntry(dedup, entry1);

    // Manually set the hash timestamp to be expired
    const hashKey = [...dedup.hashes.keys()][0];
    dedup.hashes.set(hashKey, Date.now() - dedup.windowMs - 1000);

    const entry2 = makeEntry({ title: 'New', rawContent: 'New content' });
    isDuplicate(dedup, entry2);

    // The old hash should have been cleaned
    expect(dedup.hashes.has(hashKey)).toBe(false);
  });

  // DD-010
  it('DD-010: getDeduplicatorStats returns correct stats with activeHashes', () => {
    const entry1 = makeEntry({ title: 'A', rawContent: 'content A' });
    const entry2 = makeEntry({ title: 'B', rawContent: 'content B' });
    addEntry(dedup, entry1);
    addEntry(dedup, entry2);
    isDuplicate(dedup, entry1); // duplicate

    const stats = getDeduplicatorStats(dedup);
    expect(stats.unique).toBe(2);
    expect(stats.duplicates).toBe(1);
    expect(stats.activeHashes).toBe(2);
  });

  // DD-011
  it('DD-011: clearDeduplicator resets all state', () => {
    const entry = makeEntry();
    addEntry(dedup, entry);
    isDuplicate(dedup, entry);

    clearDeduplicator(dedup);
    expect(dedup.hashes.size).toBe(0);
    expect(dedup.stats.total).toBe(0);
    expect(dedup.stats.unique).toBe(0);
    expect(dedup.stats.duplicates).toBe(0);
  });

  // DD-012
  it('DD-012: hashing is case-insensitive', () => {
    const entry1 = makeEntry({ title: 'UPPER CASE', rawContent: 'CONTENT' });
    const entry2 = makeEntry({ title: 'upper case', rawContent: 'content' });
    addEntry(dedup, entry1);
    expect(isDuplicate(dedup, entry2)).toBe(true);
  });

  // DD-013
  it('DD-013: addEntry increments unique count', () => {
    addEntry(dedup, makeEntry({ title: 'A', rawContent: 'a' }));
    addEntry(dedup, makeEntry({ title: 'B', rawContent: 'b' }));
    addEntry(dedup, makeEntry({ title: 'C', rawContent: 'c' }));
    expect(dedup.stats.unique).toBe(3);
  });
});
