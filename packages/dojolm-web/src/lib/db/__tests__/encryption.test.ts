import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt, validateEncryptionKey, resetEncryptionKey } from '../encryption';

describe('Encryption module', () => {
  const ORIGINAL_ENV = process.env.TPI_DB_ENCRYPTION_KEY;

  beforeEach(() => {
    resetEncryptionKey();
    process.env.TPI_DB_ENCRYPTION_KEY = 'a-very-secure-test-key-that-is-at-least-32-chars-long!';
  });

  afterEach(() => {
    resetEncryptionKey();
    if (ORIGINAL_ENV !== undefined) {
      process.env.TPI_DB_ENCRYPTION_KEY = ORIGINAL_ENV;
    } else {
      delete process.env.TPI_DB_ENCRYPTION_KEY;
    }
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('encrypts and decrypts a simple string', () => {
      const plaintext = 'sk-abc123-my-api-key';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts an empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts unicode content', () => {
      const plaintext = 'API-key-with-特殊文字-🔑';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts a long string', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('nonce uniqueness', () => {
    it('produces different ciphertexts for the same plaintext', () => {
      const plaintext = 'same-key-value';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Ciphertexts should differ (different random IVs)
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to the same plaintext
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('tamper detection', () => {
    it('rejects modified ciphertext', () => {
      const encrypted = encrypt('sensitive-data');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext
      const tampered = Buffer.from(parts[1], 'base64');
      tampered[0] = tampered[0] ^ 0xff;
      parts[1] = tampered.toString('base64');
      const tamperedStr = parts.join(':');

      expect(() => decrypt(tamperedStr)).toThrow();
    });

    it('rejects modified auth tag', () => {
      const encrypted = encrypt('sensitive-data');
      const parts = encrypted.split(':');
      // Tamper with the auth tag
      const tampered = Buffer.from(parts[2], 'base64');
      tampered[0] = tampered[0] ^ 0xff;
      parts[2] = tampered.toString('base64');
      const tamperedStr = parts.join(':');

      expect(() => decrypt(tamperedStr)).toThrow();
    });

    it('rejects invalid format', () => {
      expect(() => decrypt('not-valid-format')).toThrow('Invalid encrypted format');
    });
  });

  describe('key validation', () => {
    it('throws if TPI_DB_ENCRYPTION_KEY is not set', () => {
      resetEncryptionKey();
      delete process.env.TPI_DB_ENCRYPTION_KEY;

      expect(() => validateEncryptionKey()).toThrow('TPI_DB_ENCRYPTION_KEY environment variable is not set');
    });

    it('throws if key is too short', () => {
      resetEncryptionKey();
      process.env.TPI_DB_ENCRYPTION_KEY = 'short';

      expect(() => validateEncryptionKey()).toThrow('at least 32 characters');
    });

    it('succeeds with valid key', () => {
      expect(() => validateEncryptionKey()).not.toThrow();
    });
  });

  describe('cross-key isolation', () => {
    it('cannot decrypt with a different key', () => {
      const encrypted = encrypt('secret-api-key');

      // Change key
      resetEncryptionKey();
      process.env.TPI_DB_ENCRYPTION_KEY = 'a-completely-different-key-that-is-also-32-chars!';

      expect(() => decrypt(encrypted)).toThrow();
    });
  });
});
