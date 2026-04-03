import { describe, it, expect } from 'vitest';
import { ROLE_RULES } from './role-rules.js';

describe('ROLE_RULES', () => {
  const getRule = (id: string) => ROLE_RULES.find((r) => r.id === id)!;

  describe('role-no-statement', () => {
    const rule = getRule('role-no-statement');

    it('detects missing role statement', () => {
      expect(rule.detect('Tell me a joke')).not.toBeNull();
    });

    it('returns null when role statement present', () => {
      expect(rule.detect('You are a helpful assistant.')).toBeNull();
    });

    it('prepends role statement on fix', () => {
      const fixed = rule.fix('Tell me a joke');
      expect(fixed).toMatch(/^You are a helpful/);
    });
  });

  describe('role-weak-definition', () => {
    const rule = getRule('role-weak-definition');

    it('detects a brief role definition', () => {
      const issue = rule.detect('You are an AI.');
      expect(issue).not.toBeNull();
    });

    it('returns null when role is detailed enough', () => {
      expect(rule.detect('You are a professional security analyst who reviews code for vulnerabilities.')).toBeNull();
    });

    it('returns null when no role statement exists', () => {
      expect(rule.detect('Just do whatever.')).toBeNull();
    });
  });

  describe('role-no-authority-scope', () => {
    const rule = getRule('role-no-authority-scope');

    it('detects missing authority scope when role exists', () => {
      const issue = rule.detect('You are a helpful assistant.');
      expect(issue).not.toBeNull();
    });

    it('returns null when authority scope present', () => {
      expect(rule.detect('You are a helpful assistant. You cannot access external systems.')).toBeNull();
    });

    it('returns null when no role statement exists', () => {
      expect(rule.detect('Just do whatever.')).toBeNull();
    });
  });

  describe('role-no-identity-reinforcement', () => {
    const rule = getRule('role-no-identity-reinforcement');

    it('detects missing identity reinforcement', () => {
      expect(rule.detect('You are an assistant.')).not.toBeNull();
    });

    it('returns null when reinforcement present', () => {
      expect(rule.detect('Always remain in your assigned role.')).toBeNull();
    });
  });
});
