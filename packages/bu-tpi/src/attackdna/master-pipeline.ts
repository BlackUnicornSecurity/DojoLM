/**
 * File: master-pipeline.ts
 * Purpose: Master Tier Pipeline Engine — fetch, parse, deduplicate, classify, convert
 * Story: KASHIWA-11.2
 * Index:
 * - syncSource() — single source sync (line 25)
 * - syncAllSources() — all enabled sources (line 60)
 * - deduplicateEntries() (line 95)
 * - classifyEntries() (line 115)
 * - convertToAttackNodes() (line 135)
 */

import type { MasterThreatEntry, MasterSyncResult, AttackNode } from './types.js';
import type { MasterSourceAdapter } from './master-sources.js';
import { getAdapter, getAvailableSourceIds, getAllAdapters } from './master-sources.js';
import { classifyThreat, assessSeverity } from '../threatfeed/classifier.js';
import { createDeduplicator, isDuplicate, addEntry as addDeduplicatorEntry } from '../threatfeed/deduplicator.js';
import { sanitizeContent } from '../threatfeed/content-sanitizer.js';
import { randomUUID } from 'crypto';

// ===========================================================================
// Single Source Sync
// ===========================================================================

export interface SourceSyncResult {
  sourceId: string;
  entriesFetched: number;
  entriesAfterDedup: number;
  entriesClassified: number;
  errors: string[];
}

/**
 * Sync a single source: fetch -> parse -> sanitize -> deduplicate -> classify
 */
export async function syncSource(
  sourceId: string,
  existingEntries?: MasterThreatEntry[]
): Promise<{ entries: MasterThreatEntry[]; result: SourceSyncResult }> {
  const result: SourceSyncResult = {
    sourceId,
    entriesFetched: 0,
    entriesAfterDedup: 0,
    entriesClassified: 0,
    errors: [],
  };

  const adapter = getAdapter(sourceId);
  if (!adapter) {
    result.errors.push(`Unknown source: ${sourceId}`);
    return { entries: [], result };
  }

  try {
    // Fetch
    const raw = await adapter.fetch();

    // Parse
    const parsed = adapter.parse(raw);
    result.entriesFetched = parsed.length;

    // Sanitize
    const sanitized = parsed.map(entry => ({
      ...entry,
      description: sanitizeContent(entry.description).sanitized,
      rawContent: sanitizeContent(entry.rawContent).sanitized,
    }));

    // Deduplicate (cross-source against existing entries)
    const deduped = deduplicateEntries(sanitized, existingEntries);
    result.entriesAfterDedup = deduped.length;

    // Classify
    const classified = classifyEntries(deduped);
    result.entriesClassified = classified.length;

    return { entries: classified, result };
  } catch (error) {
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    return { entries: [], result };
  }
}

// ===========================================================================
// Sync All Sources
// ===========================================================================

/**
 * Sync all enabled sources. One source failing doesn't block others.
 */
export async function syncAllSources(
  enabledSources?: string[],
  existingEntries?: MasterThreatEntry[]
): Promise<{ entries: MasterThreatEntry[]; syncResult: MasterSyncResult }> {
  const sources = enabledSources || getAvailableSourceIds();
  const allEntries: MasterThreatEntry[] = [];
  const allErrors: string[] = [];
  let totalFetched = 0;
  let totalDeduped = 0;
  let totalClassified = 0;

  // Accumulate existing entries for cross-source dedup
  const existingPool = [...(existingEntries || [])];

  for (const sourceId of sources) {
    const { entries, result } = await syncSource(sourceId, existingPool);
    totalFetched += result.entriesFetched;
    totalDeduped += result.entriesAfterDedup;
    totalClassified += result.entriesClassified;
    allErrors.push(...result.errors);
    allEntries.push(...entries);
    // Add entries to pool for cross-source dedup
    existingPool.push(...entries);
  }

  const syncResult: MasterSyncResult = {
    syncedAt: new Date().toISOString(),
    sourcesProcessed: sources.length,
    entriesFetched: totalFetched,
    entriesAfterDedup: totalDeduped,
    entriesClassified: totalClassified,
    errors: allErrors,
  };

  return { entries: allEntries, syncResult };
}

// ===========================================================================
// Deduplication (Cross-Source)
// ===========================================================================

/**
 * Deduplicate entries against existing entries using content hashing.
 * Same threat from multiple sources = one entry.
 */
export function deduplicateEntries(
  newEntries: MasterThreatEntry[],
  existingEntries?: MasterThreatEntry[]
): MasterThreatEntry[] {
  const dedup = createDeduplicator(0); // No time window for dedup (permanent)

  // Seed dedup with existing entries
  if (existingEntries) {
    for (const entry of existingEntries) {
      addDeduplicatorEntry(dedup, {
        id: entry.id,
        sourceId: entry.sourceId,
        title: entry.title,
        description: entry.description,
        rawContent: entry.rawContent,
        classifiedType: entry.category,
        severity: entry.severity,
        confidence: entry.confidence,
        indicators: entry.indicators.map(i => ({ type: 'pattern' as const, value: i, context: '' })),
        extractedPatterns: [],
        createdAt: entry.firstSeen,
        processedAt: entry.lastUpdated,
      });
    }
  }

  const unique: MasterThreatEntry[] = [];

  for (const entry of newEntries) {
    const threatEntry = {
      id: entry.id,
      sourceId: entry.sourceId,
      title: entry.title,
      description: entry.description,
      rawContent: entry.rawContent,
      classifiedType: entry.category,
      severity: entry.severity,
      confidence: entry.confidence,
      indicators: entry.indicators.map(i => ({ type: 'pattern' as const, value: i, context: '' })),
      extractedPatterns: [],
      createdAt: entry.firstSeen,
      processedAt: entry.lastUpdated,
    };

    if (!isDuplicate(dedup, threatEntry)) {
      addDeduplicatorEntry(dedup, threatEntry);
      unique.push(entry);
    }
  }

  return unique;
}

// ===========================================================================
// Classification
// ===========================================================================

/**
 * Classify entries using the Mitsuke classifier for enhanced categorization.
 */
export function classifyEntries(entries: MasterThreatEntry[]): MasterThreatEntry[] {
  return entries.map(entry => {
    const threatEntry = {
      id: entry.id,
      sourceId: entry.sourceId,
      title: entry.title,
      description: entry.description,
      rawContent: entry.rawContent,
      classifiedType: entry.category,
      severity: entry.severity,
      confidence: entry.confidence,
      indicators: entry.indicators.map(i => ({ type: 'pattern' as const, value: i, context: '' })),
      extractedPatterns: [],
      createdAt: entry.firstSeen,
      processedAt: entry.lastUpdated,
    };

    const classification = classifyThreat(threatEntry);
    const severity = assessSeverity(entry.rawContent, classification);

    return {
      ...entry,
      category: classification.type || entry.category,
      severity,
      confidence: Math.max(entry.confidence, classification.confidence),
    };
  });
}

// ===========================================================================
// Convert to AttackNodes
// ===========================================================================

/**
 * Convert MasterThreatEntries to AttackNodes for DNA graph ingestion.
 */
export function convertToAttackNodes(entries: MasterThreatEntry[]): AttackNode[] {
  return entries.map(entry => ({
    id: randomUUID(),
    content: entry.rawContent.slice(0, 500_000),
    category: entry.category,
    severity: entry.severity,
    firstObserved: entry.firstSeen,
    source: `master:${entry.sourceId}`,
    parentIds: [],
    childIds: [],
    metadata: {
      sourceTier: 'master',
      masterEntryId: entry.id,
      sourceId: entry.sourceId,
      title: entry.title,
      confidence: entry.confidence,
      techniqueIds: entry.techniqueIds,
      indicators: entry.indicators,
    },
  }));
}
