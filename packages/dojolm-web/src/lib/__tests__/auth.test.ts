/**
 * Tests for auth utility functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$mockhash'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken, generateCsrfToken } from '../auth/auth';

describe('auth utilities', () => {
  describe('generateSessionToken', () => {
    it('returns a 64-char hex string', () => {
      const token = generateSessionToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });
    it('generates unique tokens', () => {
      const t1 = generateSessionToken();
      const t2 = generateSessionToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('hashSessionToken', () => {
    it('returns consistent hash for same input', () => {
      const hash1 = hashSessionToken('test-token');
      const hash2 = hashSessionToken('test-token');
      expect(hash1).toBe(hash2);
    });
    it('returns different hash for different input', () => {
      const hash1 = hashSessionToken('token-a');
      const hash2 = hashSessionToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
    it('returns a 64-char hex string', () => {
      expect(hashSessionToken('test')).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateCsrfToken', () => {
    it('returns a 64-char hex string', () => {
      expect(generateCsrfToken()).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('hashPassword', () => {
    it('calls bcrypt hash', async () => {
      const result = await hashPassword('password123');
      expect(result).toBe('$2b$12$mockhash');
    });
  });

  describe('verifyPassword', () => {
    it('calls bcrypt compare', async () => {
      const result = await verifyPassword('password123', '$2b$12$hash');
      expect(result).toBe(true);
    });
  });
});
