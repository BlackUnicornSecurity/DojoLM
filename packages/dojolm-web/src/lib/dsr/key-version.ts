// SPDX-License-Identifier: Apache-2.0
/**
 * DSR pseudonymisation key versioning (PR-E3, #134).
 *
 * Derives a stable, non-secret `keyId` from the active HMAC key. PR-E4 WORM
 * erasure markers embed this `keyId` so future readers can verify which
 * key the embedded user-hash was computed under (architect Rev 2 H-1
 * concern: WORM is append-only, so an erasure marker becomes permanently
 * bound to a non-rotatable key without a versioned-id story).
 *
 * Single source of truth lives in `bu-tpi/compliance` (`deriveDsrKeyId` +
 * `DSR_KEY_VERSION_SALT`) so that this dojolm-web env loader and the
 * bu-tpi audit-overlay never drift apart.
 *
 * Usage (PR-E4): the WORM `dsr.erasure` marker carries the
 * `getActiveKeyId(env)` value at write-time. Readers verifying the marker
 * later can match against the env-resolved keyId; if no match, they know
 * the chain was written under a different key version.
 */

import {
  DSR_KEY_ID_HEX_LEN,
  DSR_KEY_VERSION_SALT,
  deriveDsrKeyId,
} from 'bu-tpi/compliance';

/** Re-exported for legacy callers. New code should import from bu-tpi/compliance. */
export const KEY_VERSION_SALT = DSR_KEY_VERSION_SALT;
export const KEY_ID_HEX_LEN = DSR_KEY_ID_HEX_LEN;

/**
 * Derive the active keyId from the supplied key string. Pure function;
 * caller resolves the key from env. Throws if `key` is empty so callers
 * cannot accidentally produce a "no-key" identifier that collides with a
 * real one. Re-exports the bu-tpi single-source helper so existing
 * imports of `deriveKeyId` continue to work.
 */
export const deriveKeyId = deriveDsrKeyId;

/**
 * Resolve the active key from env and derive its keyId. The env var
 * `DSR_PSEUDONYM_HMAC_KEY` is the source of truth; the dojolm-web factory
 * (`dsr/factory.ts`) is the only sanctioned caller.
 *
 * Returns `null` when the env var is absent — callers under
 * `DSR_BACKEND=postgres` should treat null as a configuration error;
 * callers under `DSR_BACKEND=memory` may fall back to the dev key.
 */
export function getActiveKeyId(env: NodeJS.ProcessEnv = process.env): string | null {
  const key = env.DSR_PSEUDONYM_HMAC_KEY?.trim();
  if (!key) return null;
  return deriveDsrKeyId(key);
}
