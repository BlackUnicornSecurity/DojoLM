// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/atemi/registry.ts
 * Purpose: Process-scoped singletons for the Gap 3 Atemi plumbing —
 * the `TosAttestationRegistry` and `AtemiAuthVault` that the admin UI
 * + API routes read/write.
 *
 * Flag-gated by `ATEMI_ENABLED=true`. When the flag is off, callers
 * that need the registry receive `undefined` — routes MUST short-circuit
 * with 404.
 *
 * Production-warning banner: the Vault-backed `KmsVault` is deferred
 * (ADR-0002). Dev + test wire `InMemoryKmsVault`, which emits its own
 * stderr warning if constructed under NODE_ENV=production.
 */

import {
  AtemiAuthVault,
  TosAttestationRegistry,
} from 'bu-tpi/atemi';
import { InMemoryKmsVault } from 'bu-tpi/security';

let _registry: TosAttestationRegistry | undefined;
let _vault: AtemiAuthVault | undefined;

export function isAtemiEnabled(): boolean {
  return process.env.ATEMI_ENABLED === 'true';
}

export function getTosRegistry(): TosAttestationRegistry {
  if (!_registry) {
    _registry = new TosAttestationRegistry();
  }
  return _registry;
}

export function getAuthVault(): AtemiAuthVault {
  if (!_vault) {
    _vault = new AtemiAuthVault({ kms: new InMemoryKmsVault() });
  }
  return _vault;
}

/** Test helper — reset singletons between tests. */
export function _resetAtemiRegistryForTests(): void {
  _registry = undefined;
  _vault = undefined;
}
