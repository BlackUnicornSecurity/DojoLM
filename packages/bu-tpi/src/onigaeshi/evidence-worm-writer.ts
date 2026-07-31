// SPDX-License-Identifier: Apache-2.0
/**
 * File: onigaeshi/evidence-worm-writer.ts
 * Purpose: H-3 (ADR-0098 §3) — append-only WORM writer for `EvidenceRecord` v2,
 *          mirroring the `WormAuditWriter` pattern but specialised for
 *          auto-captured compliance evidence emitted by H-2 middleware.
 *
 * =====================================================================
 *  DESIGN
 * =====================================================================
 *  Mirrors `audit-worm-writer.ts` but with a smaller surface:
 *    - `WormEvidenceStore` is a per-record append store (not S3-prefix-keyed):
 *      drivers append a sequence-numbered entry and read by seq range.
 *    - `WormEvidenceWriter.append(record)` hashes the record + previous hash
 *      into a SHA-256 chain and persists via the injected store.
 *    - `verifyIntegrity()` walks the chain from seq 0 and reports the
 *      first failure (or `valid=true`).
 *
 *  DSR cascade integration (ADR-0093 Path B): erasure markers continue to
 *  flow through `WormAuditWriter.appendDsrErasureMarker`. Read-side
 *  consumers of evidence run the same overlay logic as audit consumers —
 *  `pii_*`-prefixed fields plus `input` / `output` are masked when an
 *  erasure marker resolves to the same user-hash. Verdict, AIVSS, and
 *  control refs are preserved (see EvidenceRecord JSDoc).
 *
 *  Storage drivers (per ticket §3):
 *    - In-memory driver lives at `dojolm-web/src/lib/evidence/store.ts`
 *      and mirrors the PR-E4 in-memory pattern.
 *    - Postgres driver shape is declared (in dojolm-web) but full impl is
 *      H-3-FOLLOWUP — follows the PR-E4 PR-#411 pattern.
 *
 *  Concurrency: `append` is sequential within a single writer instance.
 *  External orchestration (e.g. the lazy single-flight cache in
 *  `dojolm-web/src/lib/onigaeshi/worm-store.ts`) ensures only one writer
 *  instance is active per store.
 *
 *  R-T1: the record carries the full `EvidenceRecord` payload including
 *  `input` and `output`. PII protection is enforced by the DSR overlay at
 *  read time, not by truncation at write time — the auditor of last resort
 *  needs the raw record. Storage backends MUST encrypt at rest.
 */

import { createHash } from 'node:crypto';
import type { EvidenceRecord } from '../compliance/evidence.js';

// ---------------------------------------------------------------------------
// Store interface — injected; web layer registers an in-memory or postgres
// driver via `dojolm-web/src/lib/evidence/store.ts`.
// ---------------------------------------------------------------------------

/**
 * Atomic snapshot of the chain tail. Drivers MUST return both fields from
 * the same logical observation so a writer-side caller cannot observe a
 * `seq` from one snapshot and a `prevHash` from another (TOCTOU gap).
 *
 * In the postgres driver this maps to a single SELECT inside a
 * SERIALIZABLE transaction; in the in-memory driver the JS event-loop
 * already serialises the read.
 */
export interface WormEvidenceTail {
  readonly seq: number;
  readonly prevHash: string | null;
}

/**
 * Append-only WORM store for `WormEvidenceEntry`. Implementations must:
 *   - Reject `append` calls whose `seq` already exists (no overwrites).
 *   - Persist entries durably before resolving the returned promise.
 *   - Return entries from `read` in ascending `seq` order.
 *
 * In-memory and postgres adapters live in
 * `packages/dojolm-web/src/lib/evidence/store.ts`.
 */
export interface WormEvidenceStore {
  /**
   * Persist a single entry. Implementations must reject if an entry with
   * the same `seq` already exists (one-way append).
   */
  readonly append: (
    record: EvidenceRecord,
    prevHash: string | null,
  ) => Promise<WormEvidenceEntry>;

  /**
   * Read a contiguous range `[seqStart, seqEnd]` (inclusive). When
   * `seqEnd` is omitted, reads from `seqStart` to the chain tail.
   * Returns entries in ascending seq order.
   */
  readonly read: (
    seqStart: number,
    seqEnd?: number,
  ) => Promise<readonly WormEvidenceEntry[]>;

  /** Return the hash of the latest entry, or null when the chain is empty. */
  readonly latestHash: () => Promise<string | null>;

  /** Return the count of persisted entries (one more than the tail seq). */
  readonly count: () => Promise<number>;

  /**
   * Atomic combined read of the next-`seq` (= count) and the tail hash.
   * Used by the writer to compute the next chain link without a TOCTOU
   * gap between two independent reads. Drivers MUST return a coherent
   * snapshot — never one half from before an `append` and the other half
   * from after.
   */
  readonly tailState: () => Promise<WormEvidenceTail>;
}

/**
 * One link in the evidence WORM chain. `prevHash` chains backwards to
 * the previous entry's `hash`; the genesis entry has `prevHash: null`.
 * `hash` is sha256 over canonical JSON of `{record, prevHash, seq}`.
 */
export interface WormEvidenceEntry {
  readonly seq: number;
  readonly record: EvidenceRecord;
  readonly prevHash: string | null;
  readonly hash: string;
}

export interface WormEvidenceIntegrityReport {
  readonly valid: boolean;
  readonly checked: number;
  readonly firstFailureSeq?: number;
}

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

/**
 * Recursively serialise a value with stable lexicographic key order.
 * Mirrors the canonicalisation discipline of `audit-worm-writer.ts` so the
 * chain hash is invariant under future field reorderings, intersection
 * spread, or downstream consumers that re-build records from partials.
 */
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map((k) => {
    const v = (value as Record<string, unknown>)[k];
    return `${JSON.stringify(k)}:${canonicalStringify(v)}`;
  });
  return `{${parts.join(',')}}`;
}

/**
 * Compute the chain hash for a record at a given seq.
 *
 * Hash input is the canonical (lexicographic-key) serialisation of
 * `{prevHash, record, seq}`. Canonicalisation is full-recursive so any
 * future refactor to `EvidenceRecord` (added fields, reordered intersection
 * spread, downstream `Partial<>` rebuild) cannot silently break chain
 * verification. Mirrors the audit-side discipline in `audit-worm-writer.ts`.
 */
export function computeHash(
  record: EvidenceRecord,
  prevHash: string | null,
  seq: number,
): string {
  const payload = canonicalStringify({ prevHash, record, seq });
  return createHash('sha256').update(payload).digest('hex');
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

export interface WormEvidenceWriterOptions {
  readonly store: WormEvidenceStore;
}

export class WormEvidenceWriter {
  private readonly store: WormEvidenceStore;
  private inflight: Promise<unknown> = Promise.resolve();

  constructor(opts: WormEvidenceWriterOptions) {
    this.store = opts.store;
  }

  /**
   * Append `record` to the chain. Computes the next sequence + chain
   * hash from the current store tail, then delegates persistence to the
   * store. Concurrent calls on the same writer are serialised
   * (single-flight queue) so two callers can never race to the same
   * `seq`.
   *
   * Multiple writer instances against the same store remain a hazard;
   * higher-level orchestration must enforce single-writer semantics
   * (see `dojolm-web/src/lib/onigaeshi/worm-store.ts` for the audit-side
   * pattern).
   */
  async append(record: EvidenceRecord): Promise<WormEvidenceEntry> {
    const next = this.inflight.then(() => this.doAppend(record));
    // Swallow rejection on the chained promise so a single failure
    // doesn't poison the queue for subsequent callers.
    this.inflight = next.catch(() => undefined);
    return next;
  }

  private async doAppend(record: EvidenceRecord): Promise<WormEvidenceEntry> {
    // Atomic tail-state read closes the TOCTOU gap that would otherwise
    // exist between independent count() and latestHash() calls. Drivers
    // implement this in a single transaction (postgres) or single
    // synchronous read (in-memory).
    const { seq, prevHash } = await this.store.tailState();
    const hash = computeHash(record, prevHash, seq);
    const entry = await this.store.append(record, prevHash);
    if (entry.seq !== seq) {
      throw new Error(
        `WormEvidenceWriter.append: store returned seq ${entry.seq} but expected ${seq}`,
      );
    }
    if (entry.hash !== hash) {
      throw new Error(
        `WormEvidenceWriter.append: store returned hash ${entry.hash} but expected ${hash}`,
      );
    }
    return Object.freeze(entry);
  }

  /**
   * Walk the chain from seq 0 forward, recomputing the hash at each
   * step. Returns `{valid: true, checked: count}` when the chain is
   * intact, or `{valid: false, firstFailureSeq: n}` on the first
   * detected failure (hash mismatch or chain break).
   */
  async verifyIntegrity(): Promise<WormEvidenceIntegrityReport> {
    const count = await this.store.count();
    if (count === 0) {
      return { valid: true, checked: 0 };
    }
    const entries = await this.store.read(0, count - 1);
    let prevHash: string | null = null;
    let expectedSeq = 0;
    for (const entry of entries) {
      if (entry.seq !== expectedSeq) {
        return {
          valid: false,
          checked: expectedSeq,
          firstFailureSeq: entry.seq,
        };
      }
      if (entry.prevHash !== prevHash) {
        return {
          valid: false,
          checked: expectedSeq,
          firstFailureSeq: entry.seq,
        };
      }
      const computed = computeHash(entry.record, entry.prevHash, entry.seq);
      if (computed !== entry.hash) {
        return {
          valid: false,
          checked: expectedSeq,
          firstFailureSeq: entry.seq,
        };
      }
      prevHash = entry.hash;
      expectedSeq += 1;
    }
    return { valid: true, checked: entries.length };
  }
}
