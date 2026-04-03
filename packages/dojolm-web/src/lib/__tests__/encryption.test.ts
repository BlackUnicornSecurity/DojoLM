import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('encryption', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.TPI_DB_ENCRYPTION_KEY = 'test-encryption-key-that-is-long-enough-for-testing';
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('encrypt and decrypt round-trip', async () => {
    const { encrypt, decrypt, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    const plaintext = 'Hello, World!';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypted format has 3 parts (iv:ciphertext:authTag)', async () => {
    const { encrypt, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // Each part should be valid base64
    for (const part of parts) {
      expect(Buffer.from(part, 'base64').toString('base64')).toBe(part);
    }
  });

  it('different plaintexts produce different ciphertexts', async () => {
    const { encrypt, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    const e1 = encrypt('hello');
    const e2 = encrypt('world');
    expect(e1).not.toBe(e2);
  });

  it('same plaintext produces different ciphertexts (random IV)', async () => {
    const { encrypt, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    const e1 = encrypt('same');
    const e2 = encrypt('same');
    expect(e1).not.toBe(e2);
  });

  it('handles empty string', async () => {
    const { encrypt, decrypt, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('handles unicode text', async () => {
    const { encrypt, decrypt, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    const plaintext = 'Hello 世界 🔐';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('decrypt rejects malformed input (wrong number of parts)', async () => {
    const { decrypt, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    expect(() => decrypt('onlyonepart')).toThrow('Invalid encrypted format');
    expect(() => decrypt('two:parts')).toThrow('Invalid encrypted format');
  });

  it('decrypt rejects tampered ciphertext (auth tag verification)', async () => {
    const { encrypt, decrypt, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    const encrypted = encrypt('secret data');
    const parts = encrypted.split(':');
    // Tamper with ciphertext
    const tampered = `${parts[0]}:${Buffer.from('tampered').toString('base64')}:${parts[2]}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('validateEncryptionKey throws without env var', async () => {
    delete process.env.TPI_DB_ENCRYPTION_KEY;
    const { validateEncryptionKey, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    expect(() => validateEncryptionKey()).toThrow('TPI_DB_ENCRYPTION_KEY');
  });

  it('validateEncryptionKey throws for key shorter than 32 chars', async () => {
    process.env.TPI_DB_ENCRYPTION_KEY = 'short';
    const { validateEncryptionKey, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    expect(() => validateEncryptionKey()).toThrow('at least 32 characters');
  });

  it('validateEncryptionKey succeeds with valid key', async () => {
    const { validateEncryptionKey, resetEncryptionKey } = await import('../db/encryption');
    resetEncryptionKey();
    expect(() => validateEncryptionKey()).not.toThrow();
  });
});
