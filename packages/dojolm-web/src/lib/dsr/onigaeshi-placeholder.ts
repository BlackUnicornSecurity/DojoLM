// SPDX-License-Identifier: Apache-2.0
/**
 * LEGACY (PR-E2 #392) — PR-E4 (#134) replaces this with `OnigaeshiWormDsrStore`.
 *
 * Retained for backward compatibility with any caller / test that still
 * imports `OnigaeshiPlaceholderStore` or `DsrOnigaeshiBackendNotReadyError`.
 * The factory's postgres branch no longer wires this — it constructs an
 * `OnigaeshiWormDsrStore` (lib/dsr/onigaeshi-worm-store.ts) which appends
 * a WORM erasure marker per the Path B design.
 *
 * Boot-time guard contract (legacy):
 *   Until PR-E4 lands, the postgres branch must NOT silently `skipped` past
 *   OnigaeshiAuditRecord on every cascade — that would lose the legal
 *   defensibility audit trail. Instead, every store method on the
 *   placeholder throws `DsrOnigaeshiBackendNotReadyError` on cascade class
 *   6 of 6, which `InMemoryDsrService` catches and converts into a
 *   `failed` ticket. The 5 prior class results are preserved on the
 *   failed ticket via `DsrCascadePartialError` (security MED-2).
 *
 * Physical removal of this file is a follow-up cleanup ticket (deferred
 * because other tests still import the symbols).
 */

import type { DsrCascadeStore } from 'bu-tpi/compliance';

/** Thrown when the postgres cascade hits the OnigaeshiAuditRecord placeholder. */
export class DsrOnigaeshiBackendNotReadyError extends Error {
  readonly code = 'DSR.ONIGAESHI.BACKEND_NOT_READY' as const;
  constructor() {
    super(
      'OnigaeshiAuditRecord cascade backend is not ready. ' +
        'PR-E4 (#134) ships the WORM + erasure-overlay implementation. ' +
        'Do NOT set DSR_BACKEND=postgres in production until PR-E4 is merged.',
    );
    this.name = 'DsrOnigaeshiBackendNotReadyError';
  }
}

/**
 * `DsrCascadeStore` placeholder for OnigaeshiAuditRecord. Every method
 * throws `DsrOnigaeshiBackendNotReadyError`. Used in the postgres branch
 * to satisfy the 6-class `DsrCascadeStores` shape without silently
 * dropping audit cascades.
 */
export class OnigaeshiPlaceholderStore implements DsrCascadeStore {
  readonly dataClass = 'OnigaeshiAuditRecord' as const;

  async deleteRawByUser(): Promise<number> {
    throw new DsrOnigaeshiBackendNotReadyError();
  }

  async pseudonymiseByUser(): Promise<number> {
    throw new DsrOnigaeshiBackendNotReadyError();
  }

  async exportByUser(): Promise<{ count: number; payload: unknown }> {
    throw new DsrOnigaeshiBackendNotReadyError();
  }
}
