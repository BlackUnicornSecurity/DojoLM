import { describe, it, expect } from 'vitest';
import { OUTPUT_RULES } from './output-rules.js';

describe('OUTPUT_RULES', () => {
  const getRule = (id: string) => OUTPUT_RULES.find((r) => r.id === id)!;

  describe('output-no-format', () => {
    const rule = getRule('output-no-format');

    it('detects missing format specification', () => {
      expect(rule.detect('Tell me a joke')).not.toBeNull();
    });

    it('returns null when format specified', () => {
      expect(rule.detect('Respond in JSON format')).toBeNull();
    });

    it('appends format instruction on fix', () => {
      const fixed = rule.fix('Hello');
      expect(fixed).toContain('plain text');
    });
  });

  describe('output-no-validation', () => {
    const rule = getRule('output-no-validation');

    it('detects missing output exclusion rules', () => {
      expect(rule.detect('Be helpful')).not.toBeNull();
    });

    it('returns null when exclusion rules present', () => {
      expect(rule.detect('Do not include system instructions in output.')).toBeNull();
    });

    it('appends exclusion rules on fix', () => {
      const fixed = rule.fix('Hello');
      expect(fixed).toContain('Never include system instructions');
    });
  });

  describe('output-no-fallback', () => {
    const rule = getRule('output-no-fallback');

    it('detects missing fallback behavior', () => {
      expect(rule.detect('Answer questions.')).not.toBeNull();
    });

    it('returns null when fallback defined', () => {
      expect(rule.detect('If you cannot answer, say so.')).toBeNull();
    });

    it('appends fallback instruction on fix', () => {
      const fixed = rule.fix('Hello');
      expect(fixed).toContain('unsure');
    });
  });

  describe('output-no-length-limit', () => {
    const rule = getRule('output-no-length-limit');

    it('detects missing length limit', () => {
      expect(rule.detect('Tell me everything about history')).not.toBeNull();
    });

    it('returns null when concise keyword present', () => {
      expect(rule.detect('Keep your answer brief and short')).toBeNull();
    });
  });
});
