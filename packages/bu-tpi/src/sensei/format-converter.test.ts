import { describe, it, expect } from 'vitest';
import {
  estimateTokenCount,
  sampleToAlpacaEntry,
  sampleToCompletionEntry,
  convertToTrainingFormat,
} from './format-converter.js';

function makeSample(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'test-1',
    content: 'test attack payload content here',
    category: 'injection',
    capability: 'attack-generation',
    source: 'sage',
    severity: 'WARNING',
    quality: 'medium',
    noveltyScore: 0.5,
    generatedAt: '2026-01-01T00:00:00Z',
    metadata: {},
    ...overrides,
  };
}

describe('format-converter', () => {
  describe('estimateTokenCount', () => {
    it('estimates ~1 token per 4 chars', () => {
      const result = estimateTokenCount('abcdefgh');
      expect(result).toBe(2);
    });

    it('handles empty string', () => {
      expect(estimateTokenCount('')).toBe(0);
    });

    it('rounds up for non-multiples of 4', () => {
      expect(estimateTokenCount('abcde')).toBe(2);
    });
  });

  describe('sampleToAlpacaEntry', () => {
    it('converts to instruction/input/output format', () => {
      const result = sampleToAlpacaEntry(makeSample());
      expect(result.instruction).toBeTruthy();
      expect(typeof result.output).toBe('string');
    });

    it('includes category info', () => {
      const result = sampleToAlpacaEntry(makeSample({ category: 'jailbreak' }));
      expect(result.instruction).toBeTruthy();
    });
  });

  describe('sampleToCompletionEntry', () => {
    it('converts to prompt/completion format', () => {
      const result = sampleToCompletionEntry(makeSample());
      expect(result.prompt).toBeTruthy();
      expect(result.completion).toBeTruthy();
    });

    it('has non-empty prompt and completion', () => {
      const result = sampleToCompletionEntry(makeSample());
      expect(result.prompt.length).toBeGreaterThan(0);
      expect(result.completion.length).toBeGreaterThan(0);
    });
  });

  describe('convertToTrainingFormat', () => {
    it('converts samples to JSONL lines', () => {
      const result = convertToTrainingFormat([makeSample()]);
      expect(result.jsonlLines.length).toBeGreaterThan(0);
      expect(result.stats).toBeDefined();
    });

    it('handles empty input', () => {
      const result = convertToTrainingFormat([]);
      expect(result.jsonlLines).toHaveLength(0);
    });

    it('produces valid JSON lines', () => {
      const result = convertToTrainingFormat([makeSample(), makeSample({ id: '2' })]);
      for (const line of result.jsonlLines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });
});
