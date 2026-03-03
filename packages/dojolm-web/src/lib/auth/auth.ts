/**
 * Authentication module: password hashing and session token generation.
 *
 * Uses bcrypt with 12 rounds for password hashing.
 * Session tokens are 32-byte random hex strings, stored as SHA-256 hashes.
 */

import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const BCRYPT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically random session token.
 * Returns the raw token (sent to client) — store the hash in DB.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a session token for storage. Tokens are never stored in plaintext.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
