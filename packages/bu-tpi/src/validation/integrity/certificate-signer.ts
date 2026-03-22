/**
 * KATANA Digital Signatures for Certificates & Reports (K8.2)
 *
 * Ed25519 keypair generation, signing, and verification for:
 * - Calibration certificates
 * - Validation reports
 *
 * Keys stored via environment variables (development) or secrets manager (production).
 * Never committed to the repository.
 *
 * ISO 17025 Clause 6.5: Metrological traceability.
 */

import {
  generateKeyPairSync,
  sign,
  verify,
  createHash,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
} from 'node:crypto';
import { INTEGRITY_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Key Management
// ---------------------------------------------------------------------------

/**
 * Generate a new Ed25519 keypair.
 * Returns PEM-encoded private and public keys.
 */
export function generateSigningKeyPair(): {
  privateKey: string;
  publicKey: string;
} {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return { privateKey, publicKey };
}

/**
 * Get the Ed25519 private key from environment variable.
 * Reads at call time (not module load time) for serverless compatibility.
 *
 * @throws Error if key is not set or invalid
 */
function getSigningKey(): KeyObject {
  const keyPem = process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR];
  if (!keyPem) {
    throw new Error(
      `Signing key not available. Set ${INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR} environment variable ` +
      `with PEM-encoded Ed25519 private key.`,
    );
  }
  const key = createPrivateKey(keyPem);
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error(
      `Signing key must be Ed25519, got '${key.asymmetricKeyType}'. ` +
      `Check ${INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR} environment variable.`,
    );
  }
  return key;
}

/**
 * Get the Ed25519 public key from environment variable.
 * Reads at call time (not module load time) for serverless compatibility.
 *
 * @throws Error if key is not set or invalid
 */
function getVerifyKey(): KeyObject {
  const keyPem = process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR];
  if (!keyPem) {
    throw new Error(
      `Verification key not available. Set ${INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR} environment variable ` +
      `with PEM-encoded Ed25519 public key.`,
    );
  }
  const key = createPublicKey(keyPem);
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error(
      `Verification key must be Ed25519, got '${key.asymmetricKeyType}'. ` +
      `Check ${INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR} environment variable.`,
    );
  }
  return key;
}

/**
 * Check if signing keys are available (without throwing).
 */
export function isSigningKeyAvailable(): boolean {
  return !!process.env[INTEGRITY_CONFIG.SIGNING_KEY_ENV_VAR];
}

/**
 * Check if verification key is available (without throwing).
 */
export function isVerifyKeyAvailable(): boolean {
  return !!process.env[INTEGRITY_CONFIG.VERIFY_KEY_ENV_VAR];
}

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

/**
 * Sign data with Ed25519.
 *
 * @param data - The data to sign (string or Buffer)
 * @param privateKey - Optional PEM-encoded private key (if omitted, reads from env)
 * @returns Hex-encoded Ed25519 signature
 */
export function signData(data: string | Buffer, privateKey?: string): string {
  const key = privateKey ? createPrivateKey(privateKey) : getSigningKey();
  const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  const signature = sign(null, dataBuffer, key);
  return signature.toString('hex');
}

/**
 * Verify an Ed25519 signature.
 *
 * @param data - The original data
 * @param signature - Hex-encoded signature
 * @param publicKey - Optional PEM-encoded public key (if omitted, reads from env)
 * @returns true if signature is valid
 */
export function verifySignature(
  data: string | Buffer,
  signature: string,
  publicKey?: string,
): boolean {
  // Key creation errors (wrong algorithm, missing env var) must propagate —
  // they indicate configuration problems, not invalid signatures.
  const key = publicKey ? createPublicKey(publicKey) : getVerifyKey();

  try {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const sigBuffer = Buffer.from(signature, 'hex');
    return verify(null, dataBuffer, key, sigBuffer);
  } catch {
    // Invalid hex, wrong signature length, or crypto verification error
    return false;
  }
}

// ---------------------------------------------------------------------------
// Content Hash + Sign (for reports and certificates)
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 content hash and sign it with Ed25519.
 * Returns both the hash and signature for verification.
 *
 * @param content - Content to hash and sign
 * @param privateKey - Optional PEM-encoded private key
 * @returns Object with content_hash and signature
 */
export function hashAndSign(
  content: string,
  privateKey?: string,
): { content_hash: string; signature: string } {
  const contentHash = createHash('sha256').update(content).digest('hex');
  const signature = signData(contentHash, privateKey);
  return { content_hash: contentHash, signature };
}

/**
 * Verify content integrity and its Ed25519 signature.
 * Recomputes the hash internally — never trusts a caller-provided hash.
 *
 * @param content - Original content to verify
 * @param signature - Ed25519 signature of the content's SHA-256 hash
 * @param publicKey - Optional PEM-encoded public key
 * @returns true if signature is valid for the content's hash
 */
export function verifyHashAndSignature(
  content: string,
  signature: string,
  publicKey?: string,
): boolean {
  const contentHash = createHash('sha256').update(content).digest('hex');
  return verifySignature(contentHash, signature, publicKey);
}

// ---------------------------------------------------------------------------
// Report Signing
// ---------------------------------------------------------------------------

/**
 * Sign a report object by computing signature over its canonical JSON
 * (excluding the signature field itself).
 *
 * @param report - Report object with optional signature field
 * @param privateKey - Optional PEM-encoded private key
 * @returns Report with signature field set
 */
export function signReport<T extends { signature?: string }>(
  report: T,
  privateKey?: string,
): T & { signature: string } {
  const { signature: _, ...withoutSig } = report;
  const canonical = canonicalize(withoutSig);
  const sig = signData(canonical, privateKey);
  return { ...report, signature: sig };
}

/**
 * Verify a signed report.
 *
 * @param report - Report object with signature field
 * @param publicKey - Optional PEM-encoded public key
 * @returns true if signature is valid
 */
export function verifyReport<T extends { signature?: string }>(
  report: T,
  publicKey?: string,
): boolean {
  const sig = report.signature;
  if (!sig) {
    return false;
  }
  const { signature: _, ...withoutSig } = report;
  const canonical = canonicalize(withoutSig);
  return verifySignature(canonical, sig, publicKey);
}

// ---------------------------------------------------------------------------
// Canonical JSON (reused from hmac-signer pattern)
// ---------------------------------------------------------------------------

/**
 * Recursively sort object keys for deterministic canonical JSON.
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
