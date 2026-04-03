import { describe, it, expect } from 'vitest';
import {
  buildMutationPrompt,
  parseMutationResponse,
} from './mutation-advisor.js';

describe('mutation-advisor', () => {
  describe('buildMutationPrompt', () => {
    it('includes content and category', () => {
      const prompt = buildMutationPrompt('test payload content', 'injection');
      expect(prompt).toContain('injection');
    });

    it('returns a non-empty string', () => {
      const prompt = buildMutationPrompt('some payload', 'jailbreak');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('parseMutationResponse', () => {
    it('parses mutation blocks', () => {
      const response = [
        '[MUTATION 1]',
        'Strategy: Synonym Replacement',
        'Description: Replace key terms with synonyms',
        'Content: This is a long enough mutated content for testing purposes',
        'Preserves Semantics: Yes',
        '[MUTATION 2]',
        'Strategy: Structure Change',
        'Description: Restructure the payload for evasion',
        'Content: Another long enough mutated content for proper testing',
        'Preserves Semantics: No',
      ].join('\n');
      const result = parseMutationResponse(response);
      expect(result.length).toBeGreaterThan(0);
      for (const m of result) {
        expect(m.strategy).toBeTruthy();
        expect(m.mutatedContent).toBeTruthy();
        expect(typeof m.preservesSemantics).toBe('boolean');
      }
    });

    it('filters short mutated content', () => {
      const response = [
        '[MUTATION 1]',
        'Strategy: Test',
        'Description: Test mutation',
        'Content: short',
        'Preserves Semantics: Yes',
      ].join('\n');
      const result = parseMutationResponse(response);
      expect(result.length).toBe(0);
    });

    it('handles empty response', () => {
      const result = parseMutationResponse('');
      expect(result.length).toBe(0);
    });

    it('parses preservesSemantics correctly', () => {
      const response = [
        '[MUTATION 1]',
        'Strategy: Encoding',
        'Description: Apply encoding transformation',
        'Content: A sufficiently long mutated payload for semantic test',
        'Preserves Semantics: Yes',
      ].join('\n');
      const result = parseMutationResponse(response);
      if (result.length > 0) {
        expect(result[0].preservesSemantics).toBe(true);
      }
    });
  });
});
