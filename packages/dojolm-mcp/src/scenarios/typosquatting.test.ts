import { describe, it, expect } from 'vitest';
import {
  TYPOSQUATTING_SCENARIO,
  TYPOSQUATTING_TOOLS,
  levenshtein,
  isConfusable,
} from './typosquatting.js';

describe('typosquatting scenario', () => {
  describe('scenario definition', () => {
    it('exports expected shape with id, name, type, description, payloads', () => {
      expect(TYPOSQUATTING_SCENARIO.id).toBe('typosquatting-01');
      expect(TYPOSQUATTING_SCENARIO.name).toBe('Tool Name Typosquatting');
      expect(TYPOSQUATTING_SCENARIO.type).toBe('name-typosquatting');
      expect(TYPOSQUATTING_SCENARIO.description).toBeTruthy();
      expect(Array.isArray(TYPOSQUATTING_SCENARIO.payloads)).toBe(true);
    });

    it('has at least 3 payloads', () => {
      expect(TYPOSQUATTING_SCENARIO.payloads.length).toBeGreaterThanOrEqual(3);
    });

    it('each payload has required fields', () => {
      for (const payload of TYPOSQUATTING_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });

    it('payloads contain comma-separated confusable names', () => {
      for (const payload of TYPOSQUATTING_SCENARIO.payloads) {
        expect(payload.content).toContain(',');
      }
    });
  });

  describe('levenshtein', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshtein('abc', 'abc')).toBe(0);
    });

    it('returns string length for empty vs non-empty', () => {
      expect(levenshtein('', 'abc')).toBe(3);
      expect(levenshtein('xyz', '')).toBe(3);
    });

    it('computes single-char edits correctly', () => {
      expect(levenshtein('cat', 'bat')).toBe(1);
      expect(levenshtein('flle_read', 'file_read')).toBe(1);
    });

    it('computes multi-char edits correctly', () => {
      expect(levenshtein('code_excute', 'code_execute')).toBeLessThanOrEqual(2);
    });
  });

  describe('isConfusable', () => {
    it('returns true for close names within default threshold', () => {
      expect(isConfusable('flle_read', 'file_read')).toBe(true);
      expect(isConfusable('web_seach', 'web_search')).toBe(true);
    });

    it('returns false for distant names', () => {
      expect(isConfusable('totally_different', 'read_file')).toBe(false);
    });

    it('respects custom threshold parameter', () => {
      expect(isConfusable('code_excute', 'code_execute', 1)).toBe(true);
      expect(isConfusable('xyz', 'code_execute', 1)).toBe(false);
    });
  });

  describe('tools', () => {
    it('exports at least 6 typosquat tools', () => {
      expect(TYPOSQUATTING_TOOLS.length).toBeGreaterThanOrEqual(6);
    });

    it('each tool has category name-typosquatting', () => {
      for (const tool of TYPOSQUATTING_TOOLS) {
        expect(tool.category).toBe('name-typosquatting');
      }
    });

    it('each tool execute returns Typosquat interception text', () => {
      for (const tool of TYPOSQUATTING_TOOLS) {
        const result = tool.execute({}, 'basic');
        expect(result.content[0].text).toContain('Typosquat');
        expect(result.metadata.attackType).toBe('name-typosquatting');
      }
    });
  });
});
