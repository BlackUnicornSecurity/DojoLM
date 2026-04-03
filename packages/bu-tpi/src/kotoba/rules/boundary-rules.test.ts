import { describe, it, expect } from 'vitest';
import { BOUNDARY_RULES } from './boundary-rules.js';

describe('BOUNDARY_RULES', () => {
  const getRule = (id: string) => BOUNDARY_RULES.find((r) => r.id === id)!;

  describe('BC-001: Missing XML delimiters', () => {
    const rule = getRule('BC-001');

    it('detects missing XML delimiters', () => {
      expect(rule.detect('Tell me a joke')).not.toBeNull();
    });

    it('returns null when XML delimiters present', () => {
      expect(rule.detect('<instructions>Do something</instructions>')).toBeNull();
    });

    it('wraps prompt in XML tags on fix', () => {
      const fixed = rule.fix('Tell me a joke');
      expect(fixed).toContain('<instructions>');
      expect(fixed).toContain('</instructions>');
    });
  });

  describe('BC-003: No system/user separation', () => {
    const rule = getRule('BC-003');

    it('detects missing system/user separation', () => {
      expect(rule.detect('Tell me a joke')).not.toBeNull();
    });

    it('returns null when system label present', () => {
      expect(rule.detect('System: You are an assistant')).toBeNull();
    });

    it('prepends System: on fix', () => {
      const fixed = rule.fix('Tell me a joke');
      expect(fixed).toMatch(/^System:/);
    });
  });

  describe('BC-005: Missing closing tags', () => {
    const rule = getRule('BC-005');

    it('detects unclosed tags', () => {
      const issue = rule.detect('<instructions>Hello world');
      expect(issue).not.toBeNull();
      expect(issue!.description).toContain('instructions');
    });

    it('returns null when all tags closed', () => {
      expect(rule.detect('<instructions>Hello</instructions>')).toBeNull();
    });

    it('appends closing tags on fix', () => {
      const fixed = rule.fix('<instructions>Hello');
      expect(fixed).toContain('</instructions>');
    });

    it('returns null when no tags present', () => {
      expect(rule.detect('No tags here')).toBeNull();
    });
  });
});
