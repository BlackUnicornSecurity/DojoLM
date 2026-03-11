/**
 * Source Pipeline Tests
 * Tests for: createPipeline, addSource, removeSource, parseRSS, parseAPI,
 * validateWebhook, processItems, ingestEntries, getPipelineStats, getEntries
 */

import { createHmac } from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPipeline,
  addSource,
  removeSource,
  parseRSS,
  parseAPI,
  validateWebhook,
  processItems,
  ingestEntries,
  getPipelineStats,
  getEntries,
} from './source-pipeline.js';
import type { ThreatSource, ThreatPipeline, ThreatEntry } from './types.js';

function makeSource(overrides: Partial<ThreatSource> = {}): ThreatSource {
  return {
    id: 'src-1',
    name: 'Test Source',
    type: 'rss',
    url: 'https://example.com/feed',
    enabled: true,
    lastPolled: null,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ThreatEntry> = {}): ThreatEntry {
  return {
    id: 'entry-1',
    sourceId: 'src-1',
    title: 'Test Entry',
    description: 'A test entry',
    rawContent: 'prompt injection jailbreak bypass safety',
    classifiedType: 'prompt-injection',
    severity: 'WARNING',
    confidence: 0.5,
    indicators: [],
    extractedPatterns: [],
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Source Pipeline', () => {
  let pipeline: ThreatPipeline;

  beforeEach(() => {
    pipeline = createPipeline();
  });

  // SP-001
  it('SP-001: createPipeline returns a pipeline with default config', () => {
    expect(pipeline.id).toBeDefined();
    expect(pipeline.entries).toEqual([]);
    expect(pipeline.stats.totalEntries).toBe(0);
    expect(pipeline.config.sources).toEqual([]);
  });

  // SP-002
  it('SP-002: addSource adds a valid source to the pipeline', () => {
    const source = makeSource();
    const result = addSource(pipeline, source);
    expect(result.success).toBe(true);
    expect(pipeline.config.sources).toHaveLength(1);
  });

  // SP-003
  it('SP-003: addSource rejects duplicate source IDs', () => {
    const source = makeSource();
    addSource(pipeline, source);
    const result = addSource(pipeline, source);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('already exists');
  });

  // SP-004
  it('SP-004: addSource rejects source with invalid URL', () => {
    const source = makeSource({ url: 'http://127.0.0.1/feed' });
    const result = addSource(pipeline, source);
    expect(result.success).toBe(false);
  });

  // SP-005
  it('SP-005: removeSource removes an existing source', () => {
    const source = makeSource();
    addSource(pipeline, source);
    expect(removeSource(pipeline, 'src-1')).toBe(true);
    expect(pipeline.config.sources).toHaveLength(0);
  });

  // SP-006
  it('SP-006: removeSource returns false for non-existent source', () => {
    expect(removeSource(pipeline, 'nonexistent')).toBe(false);
  });

  // SP-007
  it('SP-007: parseRSS extracts items from RSS XML', () => {
    const rss = `
      <rss><channel>
        <item>
          <title>Alert 1</title>
          <description>New vulnerability found</description>
        </item>
        <item>
          <title>Alert 2</title>
          <description>Patch available</description>
        </item>
      </channel></rss>
    `;
    const items = parseRSS(rss);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Alert 1');
    expect(items[1].description).toBe('Patch available');
  });

  // SP-008
  it('SP-008: parseRSS returns empty for content exceeding max length', () => {
    const oversized = '<item><title>X</title></item>'.repeat(100_000);
    expect(parseRSS(oversized)).toEqual([]);
  });

  // SP-009
  it('SP-009: parseRSS strips XXE entities from XML', () => {
    const maliciousRSS = `
      <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <rss><channel>
        <item>
          <title>&xxe;</title>
          <description>Test</description>
        </item>
      </channel></rss>
    `;
    const items = parseRSS(maliciousRSS);
    expect(items).toHaveLength(1);
    // The &xxe; entity should have been stripped
    expect(items[0].title).not.toContain('xxe');
  });

  // SP-010
  it('SP-010: parseAPI parses an array of objects', () => {
    const response = [
      { title: 'Threat A', description: 'Desc A' },
      { title: 'Threat B', summary: 'Sum B' },
    ];
    const items = parseAPI(response);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Threat A');
    expect(items[1].description).toBe('Sum B');
  });

  // SP-011
  it('SP-011: parseAPI handles a single object (non-array)', () => {
    const items = parseAPI({ name: 'Single Threat' });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Single Threat');
  });

  // SP-012
  it('SP-012: parseAPI returns empty for null/invalid input', () => {
    expect(parseAPI(null)).toEqual([]);
    expect(parseAPI('string')).toEqual([]);
    expect(parseAPI(42)).toEqual([]);
  });

  // SP-013
  it('SP-013: validateWebhook accepts valid HMAC signature', () => {
    const secret = 'test-secret';
    const body = '{"alert":"new"}';
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    expect(validateWebhook(body, sig, secret)).toBe(true);
  });

  // SP-014
  it('SP-014: validateWebhook rejects invalid HMAC signature', () => {
    expect(validateWebhook('body', 'bad-sig', 'secret')).toBe(false);
  });

  // SP-015
  it('SP-015: validateWebhook rejects missing parameters', () => {
    expect(validateWebhook('', 'sig', 'secret')).toBe(false);
    expect(validateWebhook('body', '', 'secret')).toBe(false);
    expect(validateWebhook('body', 'sig', '')).toBe(false);
  });

  // SP-016
  it('SP-016: processItems returns classified threat entries', () => {
    const items = [
      { title: 'Prompt Injection', description: 'jailbreak attempt', rawContent: 'prompt injection jailbreak' },
    ];
    const entries = processItems(items, 'src-1');
    expect(entries).toHaveLength(1);
    expect(entries[0].classifiedType).toBeDefined();
    expect(entries[0].processedAt).toBeDefined();
    expect(entries[0].sourceId).toBe('src-1');
  });

  // SP-017
  it('SP-017: processItems deduplicates identical items', () => {
    const item = { title: 'Same', description: 'Same', rawContent: 'same content' };
    const entries = processItems([item, item, item], 'src-1');
    expect(entries).toHaveLength(1);
  });

  // SP-018
  it('SP-018: ingestEntries updates pipeline entries and stats', () => {
    const entries = [
      makeEntry({ classifiedType: 'prompt-injection', severity: 'CRITICAL' }),
      makeEntry({ id: 'entry-2', classifiedType: 'dos', severity: 'WARNING' }),
    ];
    ingestEntries(pipeline, entries);
    expect(pipeline.entries).toHaveLength(2);
    expect(pipeline.stats.totalEntries).toBe(2);
    expect(pipeline.stats.byType['prompt-injection']).toBe(1);
    expect(pipeline.stats.bySeverity['CRITICAL']).toBe(1);
    expect(pipeline.stats.lastUpdated).toBeDefined();
  });

  // SP-019
  it('SP-019: getPipelineStats returns a copy of stats', () => {
    ingestEntries(pipeline, [makeEntry()]);
    const stats = getPipelineStats(pipeline);
    expect(stats.totalEntries).toBe(1);
    // Should be a copy
    expect(stats).not.toBe(pipeline.stats);
  });

  // SP-020
  it('SP-020: getEntries filters by type', () => {
    ingestEntries(pipeline, [
      makeEntry({ classifiedType: 'prompt-injection' }),
      makeEntry({ id: 'e2', classifiedType: 'dos' }),
    ]);
    const filtered = getEntries(pipeline, { type: 'dos' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].classifiedType).toBe('dos');
  });

  // SP-021
  it('SP-021: getEntries filters by severity', () => {
    ingestEntries(pipeline, [
      makeEntry({ severity: 'CRITICAL' }),
      makeEntry({ id: 'e2', severity: 'INFO' }),
    ]);
    const filtered = getEntries(pipeline, { severity: 'CRITICAL' });
    expect(filtered).toHaveLength(1);
  });

  // SP-022
  it('SP-022: getEntries filters by sourceId', () => {
    ingestEntries(pipeline, [
      makeEntry({ sourceId: 'src-a' }),
      makeEntry({ id: 'e2', sourceId: 'src-b' }),
    ]);
    const filtered = getEntries(pipeline, { sourceId: 'src-a' });
    expect(filtered).toHaveLength(1);
  });

  // SP-023
  it('SP-023: getEntries respects limit parameter', () => {
    ingestEntries(pipeline, [
      makeEntry({ id: 'e1' }),
      makeEntry({ id: 'e2' }),
      makeEntry({ id: 'e3' }),
    ]);
    const limited = getEntries(pipeline, { limit: 2 });
    expect(limited).toHaveLength(2);
  });

  // SP-024
  it('SP-024: getEntries returns sorted by createdAt descending', () => {
    ingestEntries(pipeline, [
      makeEntry({ id: 'e1', createdAt: '2024-01-01T00:00:00Z' }),
      makeEntry({ id: 'e2', createdAt: '2024-06-01T00:00:00Z' }),
      makeEntry({ id: 'e3', createdAt: '2024-03-01T00:00:00Z' }),
    ]);
    const all = getEntries(pipeline);
    expect(all[0].createdAt).toBe('2024-06-01T00:00:00Z');
    expect(all[2].createdAt).toBe('2024-01-01T00:00:00Z');
  });
});
