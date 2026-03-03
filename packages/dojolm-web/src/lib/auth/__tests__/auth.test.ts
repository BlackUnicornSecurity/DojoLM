import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken, generateCsrfToken } from '../auth';

describe('Auth module', () => {
  describe('password hashing', () => {
    it('hashes and verifies a password', async () => {
      const password = 'my-secure-password-123!';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$12$')).toBe(true); // bcrypt 12 rounds

      const valid = await verifyPassword(password, hash);
      expect(valid).toBe(true);
    });

    it('rejects wrong password', async () => {
      const hash = await hashPassword('correct-password');
      const valid = await verifyPassword('wrong-password', hash);
      expect(valid).toBe(false);
    });

    it('produces different hashes for same password', async () => {
      const password = 'same-password';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('session tokens', () => {
    it('generates a 64-char hex token', () => {
      const token = generateSessionToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('generates unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateSessionToken()));
      expect(tokens.size).toBe(100);
    });

    it('hashes token to consistent SHA-256', () => {
      const token = generateSessionToken();
      const hash1 = hashSessionToken(token);
      const hash2 = hashSessionToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('different tokens produce different hashes', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(hashSessionToken(token1)).not.toBe(hashSessionToken(token2));
    });
  });

  describe('CSRF tokens', () => {
    it('generates a 64-char hex CSRF token', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });
});
