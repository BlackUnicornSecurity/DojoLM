/**
 * IKIGAI: Sensei Sanitize Tests
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeForPrompt,
  sanitizeLabel,
  MAX_PROMPT_CONTENT_LENGTH,
} from './sanitize.js';

describe('MAX_PROMPT_CONTENT_LENGTH', () => {
  it('is 5000', () => {
    expect(MAX_PROMPT_CONTENT_LENGTH).toBe(5000);
  });
});

describe('sanitizeForPrompt', () => {
  it('strips [ATTACK N] markers', () => {
    expect(sanitizeForPrompt('[ATTACK 1] payload text')).toBe('[A] payload text');
    expect(sanitizeForPrompt('[ATTACK 42] more')).toBe('[A] more');
  });

  it('strips [CRITERION] markers', () => {
    expect(sanitizeForPrompt('[CRITERION] test')).toBe('[C] test');
  });

  it('strips [MUTATION N] markers', () => {
    expect(sanitizeForPrompt('[MUTATION 3] data')).toBe('[M] data');
  });

  it('strips [TURN N] markers', () => {
    expect(sanitizeForPrompt('[TURN 5] content')).toBe('[T] content');
  });

  it('replaces --- line separators with ___', () => {
    expect(sanitizeForPrompt('line1\n---\nline2')).toBe('line1\n___\nline2');
  });

  it('truncates to maxLength', () => {
    const long = 'A'.repeat(6000);
    const result = sanitizeForPrompt(long);
    expect(result.length).toBe(MAX_PROMPT_CONTENT_LENGTH);
  });

  it('accepts custom maxLength', () => {
    const result = sanitizeForPrompt('hello world', 5);
    expect(result).toBe('hello');
  });

  it('preserves safe content unchanged', () => {
    const safe = 'This is a normal prompt with no markers.';
    expect(sanitizeForPrompt(safe)).toBe(safe);
  });
});

describe('sanitizeLabel', () => {
  it('strips curly braces', () => {
    expect(sanitizeLabel('test{injection}')).toBe('testinjection');
  });

  it('strips newlines and carriage returns', () => {
    expect(sanitizeLabel('line1\nline2\rline3')).toBe('line1line2line3');
  });

  it('preserves normal labels', () => {
    expect(sanitizeLabel('prompt-injection')).toBe('prompt-injection');
  });
});
