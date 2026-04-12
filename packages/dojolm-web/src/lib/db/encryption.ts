/**
 * AES-256-GCM encryption module for API key protection at rest.
 *
 * Master key derived from TPI_DB_ENCRYPTION_KEY env var via PBKDF2.
 * Format: base64(iv):base64(ciphertext):base64(authTag)
 *
 * Key rotation: decrypt all records with old key, re-encrypt with new key.
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32; // 256 bits
const PBKDF2_DIGEST = 'sha512';
/**
 * Get PBKDF2 salt: uses TPI_DB_KDF_SALT env var if set, otherwise derives a
 * per-deployment salt from the master key itself. This ensures each deployment
 * with a unique master key gets a unique salt, preventing precomputed rainbow
 * tables even without an explicit TPI_DB_KDF_SALT. (AUTH-03 fix)
 */
function getPbkdf2Salt(): string {
  const explicit = process.env.TPI_DB_KDF_SALT;
  if (explicit) return explicit;

  // Derive a deployment-unique salt from the master key using a fast hash.
  // Not ideal (salt derived from key), but strictly better than a hardcoded
  // constant shared across all deployments.
  const masterKey = process.env.TPI_DB_ENCRYPTION_KEY;
  if (masterKey) {
    return crypto.createHash('sha256').update(`tpi-salt-v2:${masterKey}`).digest('hex').slice(0, 32);
  }

  // Fallback for startup validation (key missing will throw in getDerivedKey)
  return 'tpi-db-encryption-salt-v2-fallback';
}

let derivedKey: Buffer | null = null;

/**
 * Derives the encryption key from the environment variable.
 * Caches the derived key for performance.
 */
function getDerivedKey(): Buffer {
  if (derivedKey) return derivedKey;

  const masterKey = process.env.TPI_DB_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error(
      'TPI_DB_ENCRYPTION_KEY environment variable is not set. ' +
      'Set it to a secure string of at least 32 characters for API key encryption.'
    );
  }

  if (masterKey.length < 32) {
    throw new Error(
      'TPI_DB_ENCRYPTION_KEY must be at least 32 characters long. ' +
      `Current length: ${masterKey.length}`
    );
  }

  derivedKey = crypto.pbkdf2Sync(
    masterKey,
    getPbkdf2Salt(),
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  );

  return derivedKey;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns format: base64(iv):base64(ciphertext):base64(authTag)
 */
export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
}

/**
 * Decrypts an encrypted string produced by encrypt().
 * Verifies the GCM authentication tag for tamper detection.
 */
export function decrypt(encryptedString: string): string {
  const key = getDerivedKey();
  const parts = encryptedString.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format: expected iv:ciphertext:authTag');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const ciphertext = Buffer.from(parts[1], 'base64');
  const authTag = Buffer.from(parts[2], 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Validates that the encryption key is available and correct length.
 * Call during application startup to fail fast.
 */
export function validateEncryptionKey(): void {
  getDerivedKey();
}

/**
 * Resets the cached derived key. Used for testing with different keys.
 */
export function resetEncryptionKey(): void {
  derivedKey = null;
}
