// SPDX-License-Identifier: Apache-2.0
/**
 * Approval code generation + verification helpers.
 *
 * Format: 8-char RFC 4648 base32 alphabet (uppercase, no `0`/`1`/`8`/`9`)
 * over 5 random bytes. Per ticket pass-3 MED-3 we want ≥30 bits of
 * entropy; 5 bytes = 40 bits — slightly above the recommendation.
 *
 * The raw code is returned to the primary operator exactly once at submit
 * time and is never persisted. The DB stores SHA-256(code) hex.
 */

import crypto from 'node:crypto';
import { APPROVAL_CODE_BYTES } from './constants';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Generate a fresh approval code. 8 chars, 40 bits of entropy.
 *  Implementation note: streaming 5-bit accumulator over the 5-byte
 *  random buffer. Avoids BigInt (project TS target is ES2017). At any
 *  point the bitBuffer holds ≤12 bits, well within 32-bit range. */
export function generateApprovalCode(): string {
  const bytes = crypto.randomBytes(APPROVAL_CODE_BYTES);
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
  // 40 bits / 5 = 8 chars exactly; bitsInBuffer is 0 here.
  return out;
}

/** SHA-256 hex hash of a code. Stored in `pending_approvals.code_hash`. */
export function hashApprovalCode(code: string): string {
  return crypto.createHash('sha256').update(code, 'utf-8').digest('hex');
}

/**
 * Timing-safe code verification. Returns true iff the supplied raw code
 * hashes to `expectedHash`. Always runs the SHA-256 + constant-time
 * compare so the response time does not depend on the prefix match.
 */
export function verifyApprovalCode(supplied: string, expectedHash: string): boolean {
  if (typeof supplied !== 'string' || typeof expectedHash !== 'string') return false;
  if (expectedHash.length !== 64 || !/^[0-9a-f]{64}$/i.test(expectedHash)) return false;
  const suppliedHash = hashApprovalCode(supplied);
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
