/**
 * KATANA HMAC Signing Infrastructure (K1.2 / K8.1)
 *
 * HMAC signing and verification for corpus manifests.
 * Key stored as environment variable, never in repo.
 * Uses crypto.timingSafeEqual for comparison (lesson learned).
 *
 * ISO 17025 Clause 6.5: Metrological traceability.
 */

import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { INTEGRITY_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// HMAC Signing
// ---------------------------------------------------------------------------

/**
 * Sign data with HMAC-SHA256.
 * @param data - The data to sign (will be stringified if not a string)
 * @param key - HMAC key (if omitted, reads from env var)
 * @returns Hex-encoded HMAC signature
 * @throws Error if no key is available
 */
export function signHmac(data: string, key?: string): string {
  const hmacKey = key ?? getHmacKey();
  return createHmac(INTEGRITY_CONFIG.HMAC_ALGORITHM, hmacKey)
    .update(data)
    .digest('hex');
}

/**
 * Verify an HMAC signature using timing-safe comparison.
 * @param data - The original data
 * @param signature - The HMAC signature to verify (hex-encoded)
 * @param key - HMAC key (if omitted, reads from env var)
 * @returns true if signature is valid
 */
export function verifyHmac(data: string, signature: string, key?: string): boolean {
  const hmacKey = key ?? getHmacKey();
  const expected = createHmac(INTEGRITY_CONFIG.HMAC_ALGORITHM, hmacKey)
    .update(data)
    .digest('hex');

  // Use HMAC to normalize to fixed-length digests for timing-safe compare
  // (timingSafeEqual requires equal-length buffers)
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expBuf);
}

// ---------------------------------------------------------------------------
// Content Hashing
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 hash of content.
 * @param content - String or Buffer to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashContent(content: string | Buffer): string {
  return createHash(INTEGRITY_CONFIG.HASH_ALGORITHM)
    .update(content)
    .digest('hex');
}

/**
 * Compute SHA-256 hash of a file's content for manifest entries.
 * @param content - File content as string or Buffer
 * @returns 64-character hex string
 */
export function hashFile(content: string | Buffer): string {
  return hashContent(content);
}

// ---------------------------------------------------------------------------
// Manifest Signing
// ---------------------------------------------------------------------------

/**
 * Sign a manifest object. Computes HMAC over the canonical JSON
 * representation with recursively sorted keys for determinism.
 *
 * @param manifest - Manifest object (without hmac_signature field)
 * @param key - HMAC key (if omitted, reads from env var)
 * @returns The manifest with hmac_signature field set
 */
export function signManifest<T extends { hmac_signature?: string }>(
  manifest: T,
  key?: string,
): T & { hmac_signature: string } {
  const { hmac_signature: _, ...withoutSig } = manifest;
  const canonical = canonicalize(withoutSig);
  const signature = signHmac(canonical, key);
  return { ...manifest, hmac_signature: signature };
}

/**
 * Verify a signed manifest.
 *
 * @param manifest - Manifest object with hmac_signature field
 * @param key - HMAC key (if omitted, reads from env var)
 * @returns true if manifest signature is valid
 */
export function verifyManifest<T extends { hmac_signature?: string }>(
  manifest: T,
  key?: string,
): boolean {
  const signature = manifest.hmac_signature;
  if (!signature) {
    return false;
  }

  const { hmac_signature: _, ...withoutSig } = manifest;
  const canonical = canonicalize(withoutSig);
  return verifyHmac(canonical, signature, key);
}

/**
 * Recursively sort object keys for deterministic canonical JSON.
 * JSON.stringify with a replacer array only works for top-level keys,
 * so we must recurse manually to include nested object keys.
 */
function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(',')}]`;
  if (typeof obj === 'object') {
    const sorted = Object.keys(obj as Record<string, unknown>).sort()
      .map(k => `${JSON.stringify(k)}:${canonicalize((obj as Record<string, unknown>)[k])}`);
    return `{${sorted.join(',')}}`;
  }
  return JSON.stringify(obj);
}

// ---------------------------------------------------------------------------
// Key Management
// ---------------------------------------------------------------------------

/**
 * Get the HMAC key from environment variable.
 * Reads at call time (not module load time) for serverless compatibility.
 *
 * @throws Error if key is not set
 */
function getHmacKey(): string {
  const key = process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];
  if (!key || key.length < 32) {
    throw new Error(
      `HMAC key not available. Set ${INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR} environment variable ` +
      `(minimum 32 characters). Key must be stored outside the repository.`
    );
  }
  return key;
}

/**
 * Check if HMAC key is available (without throwing).
 */
export function isHmacKeyAvailable(): boolean {
  const key = process.env[INTEGRITY_CONFIG.HMAC_KEY_ENV_VAR];
  return !!key && key.length >= 32;
}
