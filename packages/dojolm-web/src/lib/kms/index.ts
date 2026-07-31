// SPDX-License-Identifier: Apache-2.0
/**
 * Server-side KmsVault factory for the dojolm-web app.
 *
 * Mirrors the `worm-store.ts` registry pattern (register + reset-for-tests
 * + lazy dev-backed singleton):
 *
 *  - In production the deploy bootstrap is expected to call
 *    `registerKmsVault(vault)` with a Vault-transit-backed adapter.
 *    That adapter lives at `dojolm-web/src/lib/kms/vault-kms-vault.ts`
 *    (ADR-0002 step 2, deferred until a Vault host is available).
 *  - In dev / CI the factory lazily constructs an `InMemoryKmsVault`
 *    when `KMS_VAULT_BACKEND=in-memory` is set. This path is what the
 *    signer-bootstrap consumes to flip `status.signer.source` to
 *    `'vault'` without standing up Vault.
 *  - When neither path is configured, `getKmsVault()` returns `null`
 *    and the engagement signer falls back to the
 *    `ONIGAESHI_ENGAGEMENT_HMAC_KEY` env var (existing back-compat).
 *
 * The `InMemoryKmsVault` constructor itself emits a one-shot stderr
 * warning when it sees `NODE_ENV=production` (see
 * `bu-tpi/src/security/kms-vault.ts` lines 150–168) — we simply let
 * that warning fire the first time the dev path runs under prod.
 */

import { InMemoryKmsVault, type KmsVault } from 'bu-tpi/security';

let registeredVault: KmsVault | null = null;
let inMemoryDevVault: InMemoryKmsVault | null = null;
let unknownBackendWarned = false;

/** Recognised `KMS_VAULT_BACKEND` values. Update when new adapters ship. */
const KNOWN_BACKENDS = new Set(['in-memory']);

/**
 * Register a KmsVault adapter. Used by the deploy bootstrap to wire the
 * production Vault adapter. Tests use this to inject a stub vault.
 */
export function registerKmsVault(vault: KmsVault): void {
  registeredVault = vault;
}

/**
 * Reset registry state between tests — never call from a request path.
 */
export function __resetKmsVaultForTests(): void {
  registeredVault = null;
  inMemoryDevVault = null;
  unknownBackendWarned = false;
}

/**
 * Resolve the active KmsVault or null. The call order is:
 *   1. Registered adapter (production / test injection).
 *   2. Lazy `InMemoryKmsVault` when `KMS_VAULT_BACKEND=in-memory`.
 *   3. null (caller falls back to env or 503s).
 *
 * The same instance is returned across calls — the in-memory adapter
 * stores per-target keys on its own `Map`, so construction-per-request
 * would defeat the vault altogether.
 *
 * When `KMS_VAULT_BACKEND` is set to a non-empty value that is not a
 * recognised backend (typo, stale deploy config), emit a one-shot
 * stderr warning so a misconfigured cluster surfaces at boot instead
 * of silently falling through to the env-key path.
 */
export function getKmsVault(): KmsVault | null {
  if (registeredVault) return registeredVault;
  const backend = process.env.KMS_VAULT_BACKEND;
  if (backend === 'in-memory') {
    if (!inMemoryDevVault) inMemoryDevVault = new InMemoryKmsVault();
    return inMemoryDevVault;
  }
  if (backend && backend.length > 0 && !KNOWN_BACKENDS.has(backend) && !unknownBackendWarned) {
    unknownBackendWarned = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[kms-vault] WARN: KMS_VAULT_BACKEND="${backend}" is not a recognised backend. ` +
        `Falling through to the env-key signer path. Known backends: ${[...KNOWN_BACKENDS].join(', ')}.`,
    );
  }
  return null;
}
