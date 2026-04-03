import { describe, it, expect } from 'vitest';
import {
  hashContent,
  jaccardSimilarity,
  filterByQuality,
  filterByLength,
  deduplicateExact,
  deduplicateSemantic,
  balanceCategories,
  curateSamples,
} from './data-curator.js';

function makeSample(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'test-1',
    content: 'test content here that is long enough',
    category: 'injection',
    capability: 'attack_detection',
    source: 'sage',
    severity: 'WARNING',
    quality: 'medium',
    noveltyScore: 0.5,
    generatedAt: '2026-01-01T00:00:00Z',
    metadata: {},
    ...overrides,
  };
}

describe('data-curator', () => {
  describe('hashContent', () => {
    it('returns consistent hash for same content', () => {
      const h1 = hashContent('hello world');
      const h2 = hashContent('hello world');
      expect(h1).toBe(h2);
    });

    it('returns different hash for different content', () => {
      const h1 = hashContent('hello world');
      const h2 = hashContent('goodbye world');
      expect(h1).not.toBe(h2);
    });
  });

  describe('jaccardSimilarity', () => {
    it('returns 1 for identical strings', () => {
      expect(jaccardSimilarity('hello world', 'hello world')).toBe(1);
    });

    it('returns 0 for no overlap', () => {
      expect(jaccardSimilarity('hello', 'world')).toBe(0);
    });

    it('returns 1 for two empty strings', () => {
      expect(jaccardSimilarity('', '')).toBe(1);
    });

    it('returns value between 0 and 1 for partial overlap', () => {
      const sim = jaccardSimilarity('hello world', 'hello there');
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });
  });

  describe('filterByQuality', () => {
    it('filters below minimum quality', () => {
      const samples = [
        makeSample({ quality: 'high' }),
        makeSample({ id: '2', quality: 'low' }),
      ];
      expect(filterByQuality(samples, 'medium').length).toBe(1);
    });

    it('keeps samples at or above minimum', () => {
      const samples = [
        makeSample({ quality: 'high' }),
        makeSample({ id: '2', quality: 'medium' }),
      ];
      expect(filterByQuality(samples, 'medium').length).toBe(2);
    });
  });

  describe('filterByLength', () => {
    it('filters by content length', () => {
      const samples = [
        makeSample({ content: 'ab' }),
        makeSample({ id: '2', content: 'a long enough content string for testing' }),
      ];
      expect(filterByLength(samples, 5, 1000).length).toBe(1);
    });

    it('filters content exceeding max length', () => {
      const samples = [
        makeSample({ content: 'a'.repeat(2000) }),
        makeSample({ id: '2', content: 'normal length content here' }),
      ];
      expect(filterByLength(samples, 5, 100).length).toBe(1);
    });
  });

  describe('deduplicateExact', () => {
    it('removes exact duplicates', () => {
      const samples = [makeSample(), makeSample({ id: '2' })];
      expect(deduplicateExact(samples).length).toBe(1);
    });

    it('keeps unique content', () => {
      const samples = [
        makeSample({ content: 'unique content one' }),
        makeSample({ id: '2', content: 'unique content two' }),
      ];
      expect(deduplicateExact(samples).length).toBe(2);
    });
  });

  describe('deduplicateSemantic', () => {
    it('removes semantically similar samples', () => {
      const s1 = makeSample({ content: 'the quick brown fox jumps over lazy dog' });
      const s2 = makeSample({
        id: '2',
        content: 'the quick brown fox jumps over lazy cat',
      });
      const s3 = makeSample({
        id: '3',
        content: 'completely different content here for testing purposes',
      });
      const result = deduplicateSemantic([s1, s2, s3], 0.7);
      expect(result.length).toBeLessThanOrEqual(3);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('balanceCategories', () => {
    it('limits samples per category', () => {
      const samples = Array.from({ length: 10 }, (_, i) =>
        makeSample({ id: `s-${i}` }),
      );
      expect(balanceCategories(samples, 3).length).toBe(3);
    });

    it('handles multiple categories', () => {
      const samples = [
        ...Array.from({ length: 5 }, (_, i) =>
          makeSample({ id: `a-${i}`, category: 'injection' }),
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeSample({ id: `b-${i}`, category: 'jailbreak' }),
        ),
      ];
      const result = balanceCategories(samples, 3);
      expect(result.length).toBe(6);
    });
  });

  describe('curateSamples', () => {
    it('runs full pipeline', () => {
      const samples = [
        makeSample({ content: 'a sufficiently long test content string for testing purposes' }),
        makeSample({
          id: '2',
          content: 'another sufficiently long test content string for curation',
        }),
      ];
      const result = curateSamples(samples);
      expect(result.samples).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('handles empty input', () => {
      const result = curateSamples([]);
      expect(result.samples).toHaveLength(0);
    });
  });
});
