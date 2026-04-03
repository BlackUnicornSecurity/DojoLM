import { describe, it, expect } from 'vitest';
import {
  generateSampleId,
  truncateContent,
  assessQuality,
  runExtractionPipeline,
} from './data-pipeline.js';

describe('data-pipeline', () => {
  describe('generateSampleId', () => {
    it('returns a prefixed hex id', () => {
      const id = generateSampleId('sage', 'seed-001');
      expect(id).toMatch(/^sensei-sage-[a-f0-9]{16}$/);
    });

    it('is deterministic', () => {
      expect(generateSampleId('sage', 'seed-001')).toBe(
        generateSampleId('sage', 'seed-001'),
      );
    });

    it('produces different ids for different inputs', () => {
      const id1 = generateSampleId('sage', 'seed-001');
      const id2 = generateSampleId('sage', 'seed-002');
      expect(id1).not.toBe(id2);
    });
  });

  describe('truncateContent', () => {
    it('does not truncate short content', () => {
      expect(truncateContent('hello world', 100)).toBe('hello world');
    });

    it('truncates at word boundary', () => {
      const result = truncateContent(
        'the quick brown fox jumps over the lazy dog',
        20,
      );
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('handles empty string', () => {
      expect(truncateContent('', 100)).toBe('');
    });
  });

  describe('assessQuality', () => {
    it('maps CRITICAL severity to high', () => {
      expect(assessQuality('long enough content here for quality', 'CRITICAL')).toBe('high');
    });

    it('maps WARNING to medium', () => {
      expect(assessQuality('long enough content here for quality', 'WARNING')).toBe('medium');
    });

    it('maps INFO to low', () => {
      expect(assessQuality('long enough content here for quality', 'INFO')).toBe('low');
    });

    it('rejects very short content', () => {
      expect(assessQuality('short', null)).toBe('rejected');
    });
  });

  describe('runExtractionPipeline', () => {
    it('returns empty results for empty input', () => {
      const result = runExtractionPipeline({});
      expect(result.samples).toHaveLength(0);
      expect(result.totalExtracted).toBe(0);
    });

    it('returns structured output', () => {
      const result = runExtractionPipeline({});
      expect(result).toHaveProperty('samples');
      expect(result).toHaveProperty('totalExtracted');
    });
  });
});
