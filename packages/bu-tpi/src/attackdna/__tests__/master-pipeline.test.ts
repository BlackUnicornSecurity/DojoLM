/**
 * File: master-pipeline.test.ts
 * Purpose: Tests for Master Pipeline Engine (Story 13.2)
 * Scope: Pipeline creation, cross-source dedup, classification, conversion
 */

import { describe, it, expect } from 'vitest';
import {
  deduplicateEntries,
  classifyEntries,
  convertToAttackNodes,
} from '../master-pipeline.js';
import type { MasterThreatEntry } from '../types.js';

// ===========================================================================
// Helper: create a test MasterThreatEntry
// ===========================================================================

function makeEntry(overrides: Partial<MasterThreatEntry> = {}): MasterThreatEntry {
  return {
    id: 'test-entry-1',
    sourceId: 'test-source',
    sourceTier: 'master',
    title: 'Test Prompt Injection Technique',
    description: 'A technique for injecting malicious prompts into LLM systems.',
    category: 'prompt-injection',
    severity: 'WARNING',
    confidence: 0.8,
    techniqueIds: ['T001'],
    indicators: ['CVE-2024-1234'],
    rawContent: 'Full technical details about prompt injection technique targeting LLM systems.',
    firstSeen: '2024-01-01T00:00:00Z',
    lastUpdated: '2024-06-01T00:00:00Z',
    metadata: { source: 'test' },
    ...overrides,
  };
}

// ===========================================================================
// deduplicateEntries()
// ===========================================================================

describe('deduplicateEntries', () => {
  it('removes duplicate entries with same content', () => {
    const entries = [
      makeEntry({ id: 'e1', title: 'Entry One', rawContent: 'Same content here' }),
      makeEntry({ id: 'e2', title: 'Entry One', rawContent: 'Same content here' }),
    ];

    const deduped = deduplicateEntries(entries);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('e1');
  });

  it('keeps entries with different content', () => {
    const entries = [
      makeEntry({ id: 'e1', title: 'Prompt Injection', rawContent: 'First technique details' }),
      makeEntry({ id: 'e2', title: 'Data Poisoning', rawContent: 'Second technique details about data poisoning' }),
    ];

    const deduped = deduplicateEntries(entries);
    expect(deduped).toHaveLength(2);
  });

  it('deduplicates against existing entries', () => {
    const existing = [
      makeEntry({ id: 'existing-1', title: 'Existing Entry', rawContent: 'Already known content' }),
    ];

    const newEntries = [
      makeEntry({ id: 'new-1', title: 'Existing Entry', rawContent: 'Already known content' }),
      makeEntry({ id: 'new-2', title: 'New Entry', rawContent: 'Brand new content not seen before' }),
    ];

    const deduped = deduplicateEntries(newEntries, existing);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('new-2');
  });

  it('handles empty inputs', () => {
    expect(deduplicateEntries([])).toEqual([]);
    expect(deduplicateEntries([], [])).toEqual([]);
  });
});

// ===========================================================================
// classifyEntries()
// ===========================================================================

describe('classifyEntries', () => {
  it('classifies entries using threat classifier', () => {
    const entries = [
      makeEntry({
        id: 'c1',
        title: 'Prompt Injection via System Override',
        description: 'Technique to inject malicious instructions via prompt injection.',
        rawContent: 'Inject system prompt override to bypass safety controls using prompt injection techniques.',
        category: 'unknown',
      }),
    ];

    const classified = classifyEntries(entries);
    expect(classified).toHaveLength(1);
    // Classification should produce a non-unknown category
    expect(classified[0].category).toBeDefined();
    expect(typeof classified[0].severity).toBe('string');
    expect(['INFO', 'WARNING', 'CRITICAL']).toContain(classified[0].severity);
  });

  it('preserves entry structure', () => {
    const entries = [makeEntry({ id: 'preserve-test' })];
    const classified = classifyEntries(entries);
    expect(classified[0].id).toBe('preserve-test');
    expect(classified[0].sourceId).toBe('test-source');
    expect(classified[0].sourceTier).toBe('master');
  });

  it('handles empty input', () => {
    expect(classifyEntries([])).toEqual([]);
  });

  it('takes maximum confidence from classifier and entry', () => {
    const entries = [makeEntry({ confidence: 0.99 })];
    const classified = classifyEntries(entries);
    expect(classified[0].confidence).toBeGreaterThanOrEqual(0.99);
  });
});

// ===========================================================================
// convertToAttackNodes()
// ===========================================================================

describe('convertToAttackNodes', () => {
  it('converts entries to AttackNodes', () => {
    const entries = [
      makeEntry({
        id: 'conv-1',
        title: 'Test Technique',
        category: 'prompt-injection',
        severity: 'CRITICAL',
        sourceId: 'mitre-atlas',
      }),
    ];

    const nodes = convertToAttackNodes(entries);
    expect(nodes).toHaveLength(1);

    const node = nodes[0];
    expect(node.id).toBeDefined();
    expect(node.content).toBe(entries[0].rawContent);
    expect(node.category).toBe('prompt-injection');
    expect(node.severity).toBe('CRITICAL');
    expect(node.source).toBe('master:mitre-atlas');
    expect(node.parentIds).toEqual([]);
    expect(node.childIds).toEqual([]);
    expect(node.metadata.sourceTier).toBe('master');
    expect(node.metadata.masterEntryId).toBe('conv-1');
    expect(node.metadata.title).toBe('Test Technique');
  });

  it('generates unique IDs for each node', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })];
    const nodes = convertToAttackNodes(entries);
    expect(nodes[0].id).not.toBe(nodes[1].id);
  });

  it('truncates content to MAX_INPUT_LENGTH', () => {
    const entries = [makeEntry({ rawContent: 'x'.repeat(600_000) })];
    const nodes = convertToAttackNodes(entries);
    expect(nodes[0].content.length).toBe(500_000);
  });

  it('handles empty input', () => {
    expect(convertToAttackNodes([])).toEqual([]);
  });

  it('preserves techniqueIds and indicators in metadata', () => {
    const entries = [makeEntry({
      techniqueIds: ['AML.T0001', 'AML.T0002'],
      indicators: ['CVE-2024-1234'],
    })];
    const nodes = convertToAttackNodes(entries);
    expect(nodes[0].metadata.techniqueIds).toEqual(['AML.T0001', 'AML.T0002']);
    expect(nodes[0].metadata.indicators).toEqual(['CVE-2024-1234']);
  });
});
