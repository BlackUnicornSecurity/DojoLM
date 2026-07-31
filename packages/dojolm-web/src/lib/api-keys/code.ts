// SPDX-License-Identifier: Apache-2.0
/**
 * API-key generation, hashing, and verification helpers (YR.14.2 / G-002).
 *
 * Format: `sk-` prefix + 24-char RFC 4648 base32 alphabet (uppercase, no
 * `0`/`1`/`8`/`9`) over 15 random bytes. 15 bytes = 120 bits of entropy
 * — long-lived secrets get the conservative ceiling, in contrast to the
 * 8-char/40-bit YR.13.3 one-time approval codes.
 *
 * The raw key is returned to the operator exactly once at create time
 * and is never persisted in plaintext. The DB stores SHA-256(key) hex
 * (64 chars).
 */

import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SECRET_PREFIX = 'sk-';
/** 24 base32 chars × 5 bits = 120 bits of entropy (15 random bytes). */
const SECRET_RANDOM_BYTES = 15;

/**
 * Generate a fresh API key. Format: `sk-` + 24 base32 chars (120 bits).
 * Stream a 5-bit accumulator over the 15-byte random buffer; avoids
 * BigInt and stays within 32-bit range.
 */
export function generateApiKey(): string {
  const bytes = crypto.randomBytes(SECRET_RANDOM_BYTES);
  let bitBuffer = 0;
  let bitsInBuffer = 0;
  let out = '';
  for (const byte of bytes) {
    bitBuffer = (bitBuffer << 8) | byte;
    bitsInBuffer += 8;
    while (bitsInBuffer >= 5) {
      bitsInBuffer -= 5;
      out += BASE32_ALPHABET[(bitBuffer >> bitsInBuffer) & 31];
    }
  }
  // 120 bits / 5 = 24 chars exactly; bitsInBuffer is 0 here.
  return SECRET_PREFIX + out;
}

/** SHA-256 hex hash of an API key. Stored in `api_keys.key_hash`. */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key, 'utf-8').digest('hex');
}

/**
 * Timing-safe API-key verification. Returns true iff the supplied raw
 * key hashes to `expectedHash`. Always runs the SHA-256 + constant-time
 * compare so the response time does not depend on the prefix match.
 */
export function verifyApiKey(supplied: string, expectedHash: string): boolean {
  if (typeof supplied !== 'string' || typeof expectedHash !== 'string') return false;
  if (expectedHash.length !== 64 || !/^[0-9a-f]{64}$/i.test(expectedHash)) return false;
  const suppliedHash = hashApiKey(supplied);
  if (suppliedHash.length !== expectedHash.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(suppliedHash, 'hex'),
      Buffer.from(expectedHash, 'hex'),
    );
  } catch {
    return false;
  }
}

/** Last-4 of a raw key for UI display (hides the secret bulk). */
export function lastFour(key: string): string {
  if (typeof key !== 'string' || key.length < 4) return '';
  return key.slice(-4);
}
