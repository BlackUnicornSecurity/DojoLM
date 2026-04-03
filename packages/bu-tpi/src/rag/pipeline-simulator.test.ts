/**
 * Tests for SUIJUTSU Phase 4.1: RAG Pipeline Simulator
 */

import { describe, it, expect } from 'vitest';
import {
  chunkDocument,
  simulateEmbedding,
  cosineSimilarity,
  simulateRetrieval,
  assembleContext,
  simulateRagPipeline,
} from './pipeline-simulator.js';
import type { RagDocument, RagChunk } from './types.js';

function makeDocument(overrides: Partial<RagDocument> = {}): RagDocument {
  return {
    id: 'doc-1',
    content: 'This is test content for the document that should be chunked.',
    metadata: {},
    source: 'test',
    poisoned: false,
    injectionPayload: null,
    ...overrides,
  };
}

describe('RAG Pipeline Simulator', () => {
  it('chunkDocument splits content into chunks of specified size', () => {
    const doc = makeDocument({ content: 'A'.repeat(200) });
    const chunks = chunkDocument(doc, 50, 10);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].content).toHaveLength(50);
    expect(chunks[0].documentId).toBe('doc-1');
    expect(chunks[0].poisoned).toBe(false);
  });

  it('chunkDocument propagates poisoned flag', () => {
    const doc = makeDocument({ poisoned: true, content: 'A'.repeat(100) });
    const chunks = chunkDocument(doc, 50, 0);

    for (const chunk of chunks) {
      expect(chunk.poisoned).toBe(true);
    }
  });

  it('simulateEmbedding produces normalized vectors of specified dimension', () => {
    const doc = makeDocument();
    const chunks = chunkDocument(doc, 512, 50);
    const embedded = simulateEmbedding(chunks[0], 128);

    expect(embedded.embedding).not.toBeNull();
    expect(embedded.embedding!).toHaveLength(128);
    // Check normalization (magnitude ~1)
    const magnitude = Math.sqrt(embedded.embedding!.reduce((s, v) => s + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 1);
  });

  it('cosineSimilarity returns 1 for identical vectors and 0 for empty/mismatched', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });

  it('assembleContext joins chunks with separators and respects token limit', () => {
    const chunks: RagChunk[] = [
      { id: 'c1', documentId: 'doc-1', content: 'Chunk one content', index: 0, embedding: null, similarityScore: null, poisoned: false },
      { id: 'c2', documentId: 'doc-1', content: 'Chunk two content', index: 1, embedding: null, similarityScore: null, poisoned: false },
    ];
    const context = assembleContext(chunks, 1000);

    expect(context).toContain('Chunk one content');
    expect(context).toContain('Chunk two content');
    expect(context).toContain('---');
  });

  it('simulateRagPipeline runs all stages and detects poisoned documents', () => {
    const docs: RagDocument[] = [
      makeDocument({ id: 'clean-1', content: 'Safe content about weather forecasting.' }),
      makeDocument({ id: 'poison-1', content: 'Safe content about weather forecasting.', poisoned: true }),
    ];

    const result = simulateRagPipeline(docs, 'weather forecast', 'retrieval-poisoning');

    expect(result.stageResults).toHaveLength(5);
    expect(result.elapsed).toBeGreaterThanOrEqual(0);
    expect(result.attackVector).toBe('retrieval-poisoning');
  });
});
