// SPDX-License-Identifier: Apache-2.0
//
// Transparency-log read client skeleton. PROVISIONAL — full impl wires to
// per-tenant Rekor namespace at E1-PHASE-4-M5 of Master Plan v1.0.

import type { TenantUrl, TransparencyLogEntry } from './types.js';

export type TransparencyOptions = TenantUrl & {
  readonly startIndex?: number;
  readonly endIndex?: number;
};

/**
 * Iterate entries in a tenant's transparency log (Rekor namespace).
 *
 * **Skeleton.** Async iterator yields zero entries until E1-PHASE-4-M5
 * wires the public transparency-log endpoint.
 */
export async function* listTransparencyEntries(
  _options: TransparencyOptions,
): AsyncIterableIterator<TransparencyLogEntry> {
  // Intentional empty iterator — see RB-15 acceptance: "skeleton only,
  // not yet npm-published; full impl at Stage 2 M-3a / M-5."
  return;
}
