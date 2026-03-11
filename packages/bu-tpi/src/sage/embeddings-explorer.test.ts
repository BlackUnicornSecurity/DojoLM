/**
 * Tests for S64: Embeddings Explorer
 */

import { describe, it, expect } from 'vitest';
import {
  buildVocabulary,
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  euclideanDistance,
  reduceTo3D,
  clusterEmbeddings,
  getEmbeddingStats,
} from './embeddings-explorer.js';
import type { EmbeddingPoint } from './embeddings-explorer.js';
import type { SeedEntry } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

function makeSeed(id: string, content: string, category: string): SeedEntry {
  return {
    id,
    content,
    category,
    attackType: 'test',
    severity: 'WARNING',
    source: 'test',
    brand: 'test',
    extractedAt: new Date().toISOString(),
  };
}

function makePoint(id: string, embedding: number[], category: string = 'test'): EmbeddingPoint {
  return { id, label: `${category}:${id}`, category, embedding };
}

describe('Embeddings Explorer', () => {
  // EE-001
  it('EE-001: buildVocabulary extracts terms from texts', () => {
    const texts = ['hello world test', 'hello again test'];
    const vocab = buildVocabulary(texts);
    expect(vocab.length).toBeGreaterThan(0);
    expect(vocab).toContain('hello');
    expect(vocab).toContain('test');
  });

  // EE-002
  it('EE-002: buildVocabulary respects maxTerms limit', () => {
    const texts = ['alpha beta gamma delta epsilon zeta eta theta'];
    const vocab = buildVocabulary(texts, 3);
    expect(vocab.length).toBeLessThanOrEqual(3);
  });

  // EE-003
  it('EE-003: buildVocabulary filters short words (<=2 chars)', () => {
    const texts = ['I am a big cat in my hat'];
    const vocab = buildVocabulary(texts);
    expect(vocab).not.toContain('am');
    expect(vocab).not.toContain('a');
    expect(vocab).toContain('big');
  });

  // EE-004
  it('EE-004: generateEmbedding produces vector of vocabulary length', () => {
    const vocab = ['hello', 'world', 'test'];
    const df = new Map([['hello', 2], ['world', 1], ['test', 3]]);
    const emb = generateEmbedding('hello world', vocab, 5, df);
    expect(emb.length).toBe(vocab.length);
  });

  // EE-005
  it('EE-005: generateEmbedding returns zeros for oversized text', () => {
    const vocab = ['hello'];
    const df = new Map([['hello', 1]]);
    const emb = generateEmbedding('x'.repeat(MAX_INPUT_LENGTH + 1), vocab, 5, df);
    expect(emb.every((v) => v === 0)).toBe(true);
  });

  // EE-006
  it('EE-006: cosineSimilarity of identical vectors is 1', () => {
    const v = [1, 2, 3, 4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  // EE-007
  it('EE-007: cosineSimilarity of orthogonal vectors is 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  // EE-008
  it('EE-008: cosineSimilarity returns 0 for different-length vectors', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  // EE-009
  it('EE-009: cosineSimilarity returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  // EE-010
  it('EE-010: euclideanDistance of identical vectors is 0', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  // EE-011
  it('EE-011: euclideanDistance returns Infinity for different-length vectors', () => {
    expect(euclideanDistance([1], [1, 2])).toBe(Infinity);
  });

  // EE-012
  it('EE-012: euclideanDistance computes correct distance', () => {
    // distance between [0,0] and [3,4] is 5
    expect(euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5, 5);
  });

  // EE-013
  it('EE-013: reduceTo3D returns points with reduced coordinates', () => {
    const points = [
      makePoint('a', [1, 2, 3, 4, 5]),
      makePoint('b', [5, 4, 3, 2, 1]),
      makePoint('c', [2, 3, 4, 5, 6]),
    ];
    const reduced = reduceTo3D(points);
    expect(reduced.length).toBe(3);
    for (const p of reduced) {
      expect(p.reduced).toBeDefined();
      expect(typeof p.reduced!.x).toBe('number');
      expect(typeof p.reduced!.y).toBe('number');
      expect(typeof p.reduced!.z).toBe('number');
    }
  });

  // EE-014
  it('EE-014: reduceTo3D handles fewer than 3 dimensions', () => {
    const points = [makePoint('a', [1, 2])];
    const reduced = reduceTo3D(points);
    expect(reduced[0].reduced).toEqual({ x: 1, y: 2, z: 0 });
  });

  // EE-015
  it('EE-015: reduceTo3D handles empty array', () => {
    expect(reduceTo3D([])).toHaveLength(0);
  });

  // EE-016
  it('EE-016: clusterEmbeddings returns clusters', () => {
    const points = [
      makePoint('a', [0, 0], 'cat-a'),
      makePoint('b', [0.1, 0.1], 'cat-a'),
      makePoint('c', [10, 10], 'cat-b'),
      makePoint('d', [10.1, 10.1], 'cat-b'),
    ];
    const clusters = clusterEmbeddings(points, 2);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    expect(clusters.length).toBeLessThanOrEqual(2);
  });

  // EE-017
  it('EE-017: clusterEmbeddings handles empty input', () => {
    expect(clusterEmbeddings([], 3)).toHaveLength(0);
  });

  // EE-018
  it('EE-018: clusterEmbeddings reduces k when fewer points than k', () => {
    const points = [makePoint('a', [1, 2])];
    const clusters = clusterEmbeddings(points, 5);
    expect(clusters.length).toBeLessThanOrEqual(1);
  });

  // EE-019
  it('EE-019: generateEmbeddings produces embeddings for seed entries', () => {
    const seeds = [
      makeSeed('s1', 'ignore previous instructions override', 'injection'),
      makeSeed('s2', 'bypass security check system', 'bypass'),
    ];
    const points = generateEmbeddings(seeds);
    expect(points).toHaveLength(2);
    expect(points[0].embedding.length).toBeGreaterThan(0);
    expect(points[0].category).toBe('injection');
  });

  // EE-020
  it('EE-020: getEmbeddingStats returns correct statistics', () => {
    const points = [
      makePoint('a', [1, 2, 3], 'cat-a'),
      makePoint('b', [4, 5, 6], 'cat-a'),
      makePoint('c', [7, 8, 9], 'cat-b'),
    ];
    const stats = getEmbeddingStats(points);
    expect(stats.totalPoints).toBe(3);
    expect(stats.dimensions).toBe(3);
    expect(stats.categories['cat-a']).toBe(2);
    expect(stats.categories['cat-b']).toBe(1);
  });
});
