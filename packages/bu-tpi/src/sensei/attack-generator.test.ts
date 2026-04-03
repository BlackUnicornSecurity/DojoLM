import { describe, it, expect } from 'vitest';
import {
  buildGenerationPrompt,
  parseGeneratedAttacks,
  createDefaultRequest,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from './attack-generator.js';

describe('attack-generator', () => {
  describe('buildGenerationPrompt', () => {
    it('includes category and count in prompt', () => {
      const prompt = buildGenerationPrompt('injection', 5, null);
      expect(prompt).toContain('injection');
      expect(prompt).toContain('5');
    });

    it('includes context when provided', () => {
      const prompt = buildGenerationPrompt('jailbreak', 3, 'target is a chatbot');
      expect(prompt).toContain('target is a chatbot');
    });

    it('handles null context', () => {
      const prompt = buildGenerationPrompt('dos', 2, null);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('parseGeneratedAttacks', () => {
    it('parses [ATTACK N]: format', () => {
      const response =
        '[ATTACK 1]: This is a long enough attack payload for testing\n[ATTACK 2]: Another long enough attack payload for testing';
      const result = parseGeneratedAttacks(response, 'injection', null);
      expect(result.length).toBe(2);
    });

    it('parses numbered list format', () => {
      const response =
        '1. This is a long enough attack payload for testing\n2. Another long enough attack payload for testing';
      const result = parseGeneratedAttacks(response, 'injection', null);
      expect(result.length).toBe(2);
    });

    it('filters short entries (< 10 chars)', () => {
      const response =
        '[ATTACK 1]: short\n[ATTACK 2]: This is a long enough attack payload for testing';
      const result = parseGeneratedAttacks(response, 'injection', null);
      expect(result.length).toBe(1);
    });

    it('returns single payload when no pattern matches', () => {
      const response = 'This is a single payload without any numbering format';
      const result = parseGeneratedAttacks(response, 'injection', null);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(response);
    });

    it('returns empty array for very short content', () => {
      const result = parseGeneratedAttacks('tiny', 'injection', null);
      expect(result.length).toBe(0);
    });
  });

  describe('createDefaultRequest', () => {
    it('creates request with defaults', () => {
      const req = createDefaultRequest('injection');
      expect(req.category).toBe('injection');
      expect(req.count).toBe(5);
      expect(req.severity).toBe('WARNING');
      expect(req.context).toBeNull();
      expect(req.temperature).toBe(DEFAULT_TEMPERATURE);
      expect(req.maxTokens).toBe(DEFAULT_MAX_TOKENS);
    });

    it('applies overrides', () => {
      const req = createDefaultRequest('injection', { count: 10, severity: 'CRITICAL' });
      expect(req.count).toBe(10);
      expect(req.severity).toBe('CRITICAL');
      expect(req.category).toBe('injection');
    });

    it('preserves category even with overrides', () => {
      const req = createDefaultRequest('jailbreak', { temperature: 0.5 });
      expect(req.category).toBe('jailbreak');
      expect(req.temperature).toBe(0.5);
    });
  });
});
