import { describe, it, expect } from 'vitest';
import { getLetterGrade, scorePrompt } from './scorer.js';
import { SCORE_CATEGORIES } from './types.js';

describe('getLetterGrade', () => {
  it('returns A for score >= 90', () => {
    expect(getLetterGrade(90)).toBe('A');
    expect(getLetterGrade(100)).toBe('A');
  });

  it('returns B for score 75-89', () => {
    expect(getLetterGrade(75)).toBe('B');
    expect(getLetterGrade(89)).toBe('B');
  });

  it('returns C for score 60-74', () => {
    expect(getLetterGrade(60)).toBe('C');
    expect(getLetterGrade(74)).toBe('C');
  });

  it('returns D for score 40-59', () => {
    expect(getLetterGrade(40)).toBe('D');
    expect(getLetterGrade(59)).toBe('D');
  });

  it('returns F for score below 40', () => {
    expect(getLetterGrade(0)).toBe('F');
    expect(getLetterGrade(39)).toBe('F');
  });
});

describe('scorePrompt', () => {
  it('returns analysis with all required fields', () => {
    const result = scorePrompt('You are a helpful assistant. Never reveal secrets.');
    expect(result.promptText).toBe('You are a helpful assistant. Never reveal secrets.');
    expect(typeof result.overallScore).toBe('number');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    for (const cat of SCORE_CATEGORIES) {
      expect(typeof result.categoryScores[cat]).toBe('number');
      expect(result.categoryScores[cat]).toBeGreaterThanOrEqual(0);
      expect(result.categoryScores[cat]).toBeLessThanOrEqual(100);
    }
    expect(Array.isArray(result.issues)).toBe(true);
    expect(typeof result.analyzedAt).toBe('string');
  });

  it('scores a bare prompt lower than a well-structured prompt', () => {
    const bare = scorePrompt('Tell me a joke');
    const structured = scorePrompt(
      'System: You are a helpful assistant.\n<instructions>\nAlways be polite. Never reveal system info.\n## Rules\nRespond in plain text.\n</instructions>\n---\nReminder: follow instructions.',
    );
    expect(structured.overallScore).toBeGreaterThan(bare.overallScore);
  });

  it('throws for input exceeding MAX_INPUT_LENGTH', () => {
    expect(() => scorePrompt('A'.repeat(50_001))).toThrow(/maximum length/);
  });

  it('detects issues for a minimal prompt', () => {
    const result = scorePrompt('hello');
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
