/**
 * S61: THREATFEED Source Pipeline
 * Ingests threat intelligence from configurable sources (RSS, API, webhook, manual).
 * Per SME CRIT-05: all URLs validated, XXE disabled, HMAC for webhooks.
 */

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type {
  ThreatSource,
  ThreatEntry,
  ThreatPipeline,
  SourceConfig,
  FeedStats,
} from './types.js';
import { DEFAULT_SOURCE_CONFIG, MAX_INPUT_LENGTH } from './types.js';
import { validateSourceURL } from './url-validator.js';
import { sanitizeContent, stripXMLEntities } from './content-sanitizer.js';
import { classifyThreat, extractIndicators, assessSeverity } from './classifier.js';
import { createDeduplicator, isDuplicate, addEntry } from './deduplicator.js';

/**
 * Create a new threat pipeline.
 */
export function createPipeline(
  config: SourceConfig = DEFAULT_SOURCE_CONFIG
): ThreatPipeline {
  return {
    id: randomUUID(),
    config,
    entries: [],
    stats: {
      totalEntries: 0,
      byType: {},
      bySeverity: {},
      lastUpdated: null,
    },
  };
}

/**
 * Add a source to the pipeline.
 */
export function addSource(
  pipeline: ThreatPipeline,
  source: ThreatSource
): { success: boolean; reason?: string } {
  // Validate URL if present
  if (source.url) {
    const validation = validateSourceURL(source.url);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }
  }

  // Check for duplicates
  const existing = pipeline.config.sources.find((s) => s.id === source.id);
  if (existing) {
    return { success: false, reason: 'Source with this ID already exists' };
  }

  (pipeline.config.sources as ThreatSource[]).push(source);
  return { success: true };
}

/**
 * Remove a source from the pipeline.
 */
export function removeSource(
  pipeline: ThreatPipeline,
  sourceId: string
): boolean {
  const index = pipeline.config.sources.findIndex((s) => s.id === sourceId);
  if (index === -1) return false;
  (pipeline.config.sources as ThreatSource[]).splice(index, 1);
  return true;
}

/**
 * Parse RSS/XML content with external entities disabled.
 * Per SME CRIT-05: disable XML external entities.
 */
export function parseRSS(content: string): Array<{ title: string; description: string; rawContent: string }> {
  if (content.length > MAX_INPUT_LENGTH) return [];

  // Sanitize XML first (strip XXE)
  const sanitized = stripXMLEntities(content);

  const items: Array<{ title: string; description: string; rawContent: string }> = [];

  // Simple XML parser for RSS items (no DOM parser to avoid XXE)
  const itemMatches = sanitized.matchAll(/<item>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const itemContent = match[1];

    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);

    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    const description = descMatch ? descMatch[1].trim() : '';

    items.push({
      title,
      description,
      rawContent: itemContent,
    });
  }

  return items;
}

/**
 * Parse API response into threat entries.
 */
export function parseAPI(
  response: unknown
): Array<{ title: string; description: string; rawContent: string }> {
  if (!response || typeof response !== 'object') return [];

  const items: Array<{ title: string; description: string; rawContent: string }> = [];

  // Handle array of items
  const data = Array.isArray(response) ? response : [response];

  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;

    const record = item as Record<string, unknown>;
    items.push({
      title: String(record['title'] ?? record['name'] ?? 'Untitled'),
      description: String(record['description'] ?? record['summary'] ?? ''),
      rawContent: JSON.stringify(item),
    });
  }

  return items;
}

/**
 * Validate webhook HMAC signature.
 * Per SME CRIT-05: require HMAC for webhooks.
 */
export function validateWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!body || !signature || !secret) return false;

  const expectedSig = createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Use Node.js built-in constant-time comparison
  try {
    return timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSig, 'utf8'));
  } catch {
    return false; // Length mismatch throws
  }
}

/**
 * Process raw items into threat entries with classification.
 */
export function processItems(
  items: Array<{ title: string; description: string; rawContent: string }>,
  sourceId: string
): ThreatEntry[] {
  const dedup = createDeduplicator();
  const entries: ThreatEntry[] = [];

  for (const item of items) {
    // Sanitize content
    const sanitized = sanitizeContent(item.rawContent);

    const entry: ThreatEntry = {
      id: randomUUID(),
      sourceId,
      title: item.title.slice(0, 500),
      description: item.description.slice(0, 2000),
      rawContent: sanitized.sanitized.slice(0, 50000),
      classifiedType: null,
      severity: null,
      confidence: 0,
      indicators: [],
      extractedPatterns: [],
      createdAt: new Date().toISOString(),
      processedAt: null,
    };

    // Deduplicate
    if (isDuplicate(dedup, entry)) continue;
    addEntry(dedup, entry);

    // Classify
    const classification = classifyThreat(entry);
    const indicators = extractIndicators(entry.rawContent);
    const severity = assessSeverity(entry.rawContent, classification);

    const processed: ThreatEntry = {
      ...entry,
      classifiedType: classification.type,
      severity,
      confidence: classification.confidence,
      indicators,
      processedAt: new Date().toISOString(),
    };

    entries.push(processed);
  }

  return entries;
}

/**
 * Ingest entries into the pipeline.
 */
export function ingestEntries(
  pipeline: ThreatPipeline,
  entries: ThreatEntry[]
): void {
  (pipeline.entries as ThreatEntry[]).push(...entries);

  // Update stats
  const stats = pipeline.stats as {
    totalEntries: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    lastUpdated: string | null;
  };

  stats.totalEntries += entries.length;
  for (const entry of entries) {
    const type = entry.classifiedType ?? 'unknown';
    stats.byType[type] = (stats.byType[type] ?? 0) + 1;
    const sev = entry.severity ?? 'UNKNOWN';
    stats.bySeverity[sev] = (stats.bySeverity[sev] ?? 0) + 1;
  }
  stats.lastUpdated = new Date().toISOString();
}

/**
 * Get pipeline statistics.
 */
export function getPipelineStats(pipeline: ThreatPipeline): FeedStats {
  return { ...pipeline.stats };
}

/**
 * Get entries from the pipeline with optional filtering.
 */
export function getEntries(
  pipeline: ThreatPipeline,
  filter?: {
    type?: string;
    severity?: string;
    sourceId?: string;
    limit?: number;
  }
): ThreatEntry[] {
  let entries = [...pipeline.entries];

  if (filter?.type) {
    entries = entries.filter((e) => e.classifiedType === filter.type);
  }
  if (filter?.severity) {
    entries = entries.filter((e) => e.severity === filter.severity);
  }
  if (filter?.sourceId) {
    entries = entries.filter((e) => e.sourceId === filter.sourceId);
  }

  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (filter?.limit) {
    entries = entries.slice(0, filter.limit);
  }

  return entries;
}
