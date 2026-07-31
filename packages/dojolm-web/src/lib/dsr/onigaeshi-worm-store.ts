// SPDX-License-Identifier: Apache-2.0
/**
 * OnigaeshiWormDsrStore — DsrCascadeStore implementation that emits a
 * WORM erasure marker instead of mutating audit data.
 *
 * Spec: PR-E4 (#134), the Phase E DSR cascade execution plan §4
 *       Path B (operator-signed-off 2026-05-03).
 *
 * Why not Postgres / why not in-place pseudonymise:
 *   `OnigaeshiAuditRecord` lives in a WORM (S3 Object Lock) chain. Object
 *   Lock in Compliance mode rejects every overwrite for the configured
 *   retention window (7y per the plan), so `UPDATE actor=hash WHERE
 *   actor=userId` is impossible by design. Instead, pseudonymise APPENDS
 *   an erasure marker carrying the userHash; readers run
 *   `applyOverlay()` to mask original entries. ADR-0011 (DSR onigaeshi
 *   WORM erasure overlay) documents the GDPR Recital 26 reasoning +
 *   the QMS counsel sign-off.
 *
 * Why a writerProvider instead of an injected writer:
 *   `WormAuditWriter` requires an async `init()` before the first
 *   `append`. The factory wires this store at module load — well before
 *   any cascade runs — so we lazily resolve + init the writer on the
 *   first cascade call. The provider is also the seam for the dev
 *   in-memory store and the prod S3-backed adapter (via
 *   `lib/onigaeshi/worm-store.ts`).
 *
 * exportByUser is intentionally a stub for PR-E4. Reading the full WORM
 * chain on every export is performance-prohibitive without an index;
 * the export-via-overlay path is a follow-up (see plan §6 sub-tickets).
 */

import type {
  DsrCascadeStore,
  DsrPseudonymiseContext,
} from 'bu-tpi/compliance';
import type { WormAuditWriter } from 'bu-tpi/onigaeshi';

export class DsrWormStoreNotConfiguredError extends Error {
  readonly code = 'DSR.ONIGAESHI.WORM_STORE_NOT_CONFIGURED' as const;
  constructor() {
    super(
      'OnigaeshiAuditRecord erasure marker cannot be written: no WORM ' +
        'audit store is wired. Set ONIGAESHI_WORM_STORE=in-memory for dev ' +
        'or configure the S3 adapter for production.',
    );
    this.name = 'DsrWormStoreNotConfiguredError';
  }
}

export class DsrCascadeContextMissingError extends Error {
  readonly code = 'DSR.ONIGAESHI.CONTEXT_MISSING' as const;
  constructor() {
    super(
      'OnigaeshiAuditRecord pseudonymiseByUser requires a DsrPseudonymiseContext ' +
        'with a valid ticketId — the WORM erasure marker embeds it for legal ' +
        'defensibility.',
    );
    this.name = 'DsrCascadeContextMissingError';
  }
}

export interface OnigaeshiWormDsrStoreOptions {
  /**
   * Lazy provider that returns an init'd `WormAuditWriter`. Returning
   * null indicates no WORM store is wired (dev/test without
   * `ONIGAESHI_WORM_STORE` env var); the cascade will fail on class 6
   * of 6 with `DsrWormStoreNotConfiguredError`, propagating up via
   * `DsrCascadePartialError` so the prior 5 cascade results are
   * preserved on the failed ticket.
   */
  readonly writerProvider: () => Promise<WormAuditWriter | null>;
  /**
   * Active keyId (12-char hex) from `key-version.ts`. Embedded on every
   * marker so future readers can detect markers written under a
   * now-rotated key.
   */
  readonly keyId: string;
}

const KEY_ID_RE = /^[a-f0-9]{12}$/;

export class OnigaeshiWormDsrStore implements DsrCascadeStore {
  readonly dataClass = 'OnigaeshiAuditRecord' as const;

  constructor(private readonly opts: OnigaeshiWormDsrStoreOptions) {
    if (
      typeof opts.keyId !== 'string' ||
      !KEY_ID_RE.test(opts.keyId)
    ) {
      throw new Error(
        'OnigaeshiWormDsrStore: keyId must be a 12-char lowercase hex string',
      );
    }
  }

  async pseudonymiseByUser(
    _userId: string,
    userHash: string,
    context: DsrPseudonymiseContext,
  ): Promise<number> {
    // Defensive — the contract requires `context`, but a misconfigured
    // direct caller (test, ad-hoc tooling) might still pass undefined.
    // The cascade orchestrator (`runDsrCascade`) always supplies it.
    if (!context || typeof context.ticketId !== 'string' || context.ticketId.length === 0) {
      throw new DsrCascadeContextMissingError();
    }
    const writer = await this.opts.writerProvider();
    if (!writer) {
      throw new DsrWormStoreNotConfiguredError();
    }
    await writer.appendDsrErasureMarker({
      userHash,
      ticketId: context.ticketId,
      keyId: this.opts.keyId,
    });
    return 1;
  }

  /**
   * DSR-export path. PR-E4 scope: export-via-overlay is a follow-up.
   * Returns empty so `runDsrCascade(_, 'export', _)` does not stall on
   * class 6 of 6. Note: `pseudonymiseByUser` is the delete-cascade path
   * (see `DELETE_ACTION_BY_CLASS.OnigaeshiAuditRecord = 'pseudonymised'`);
   * `exportByUser` is the export-cascade path. Both are covered.
   */
  async exportByUser(): Promise<{ count: number; payload: unknown }> {
    return { count: 0, payload: null };
  }
}
