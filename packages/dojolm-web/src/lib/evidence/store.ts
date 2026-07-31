// SPDX-License-Identifier: Apache-2.0
/**
 * Server-side accessor for the H-3 WORM evidence store.
 *
 * Mirrors the audit-side pattern at `lib/onigaeshi/worm-store.ts`:
 *   - In-memory driver for dev + tests (this file).
 *   - Postgres driver shape declared (interface only) so the
 *     H-3-FOLLOWUP migration can land the schema + queries without
 *     touching the writer or the route layer.
 *
 * H-2 middleware will register a driver via `registerEvidenceStore` and
 * then call `getEvidenceWriter()` to append captured records.
 *
 * Cross-refs:
 * - ADR-0098 §3 — H-3 storage backend (this file)
 * - PR-E4 (#411) — pattern used by the audit-side WORM store
 * - `packages/bu-tpi/src/onigaeshi/evidence-worm-writer.ts` — writer impl
 */

import type { EvidenceRecord } from 'bu-tpi/compliance';
import {
  WormEvidenceWriter,
  computeHash,
  type WormEvidenceEntry,
  type WormEvidenceStore,
} from 'bu-tpi/onigaeshi';

// ---------------------------------------------------------------------------
// In-memory driver — primary impl for dev + tests.
// ---------------------------------------------------------------------------

/**
 * In-memory implementation of `WormEvidenceStore`. Persists entries in a
 * monotonically-growing array; rejects out-of-order or duplicate seqs.
 *
 * Intended strictly for dev + tests. Does NOT survive process restarts.
 * Production deployments must wire the postgres driver via
 * `registerEvidenceStore`.
 */
export class InMemoryWormEvidenceStore implements WormEvidenceStore {
  private readonly entries: WormEvidenceEntry[] = [];

  async append(
    record: EvidenceRecord,
    prevHash: string | null,
  ): Promise<WormEvidenceEntry> {
    const seq = this.entries.length;
    const expectedPrev = this.entries.length === 0
      ? null
      : this.entries[this.entries.length - 1].hash;
    if (prevHash !== expectedPrev) {
      throw new Error(
        `InMemoryWormEvidenceStore.append: prevHash mismatch — chain corruption ` +
          `(got ${prevHash}, expected ${expectedPrev})`,
      );
    }
    const hash = computeHash(record, prevHash, seq);
    const entry: WormEvidenceEntry = Object.freeze({
      seq,
      record,
      prevHash,
      hash,
    });
    this.entries.push(entry);
    return entry;
  }

  async read(
    seqStart: number,
    seqEnd?: number,
  ): Promise<readonly WormEvidenceEntry[]> {
    const end = seqEnd ?? this.entries.length - 1;
    return this.entries
      .filter((e) => e.seq >= seqStart && e.seq <= end)
      .slice();
  }

  async latestHash(): Promise<string | null> {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1].hash;
  }

  async count(): Promise<number> {
    return this.entries.length;
  }

  /**
   * Atomic tail-state read. JS is single-threaded so the snapshot is
   * coherent by construction; postgres drivers wrap this in a
   * SERIALIZABLE transaction.
   */
  async tailState(): Promise<{ seq: number; prevHash: string | null }> {
    const seq = this.entries.length;
    const prevHash = seq === 0 ? null : this.entries[seq - 1].hash;
    return { seq, prevHash };
  }
}

// ---------------------------------------------------------------------------
// Postgres driver shape — full impl in TICKET-H3-FOLLOWUP-POSTGRES.
// ---------------------------------------------------------------------------

/**
 * Shape of the Postgres-backed `WormEvidenceStore` driver.
 *
 * H-3 ships only the interface; the concrete implementation lives in
 * H-3-FOLLOWUP and follows the PR-E4 PR-#411 postgres pattern (per-record
 * append-only with a transactional advisory lock for seq allocation).
 *
 * Schema sketch (H-3-FOLLOWUP):
 *   CREATE TABLE evidence_worm_chain (
 *     seq        BIGSERIAL PRIMARY KEY,
 *     record     JSONB NOT NULL,
 *     prev_hash  TEXT,
 *     hash       TEXT NOT NULL UNIQUE,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX evidence_worm_chain_seq_idx ON evidence_worm_chain (seq);
 *
 * No UPDATE / DELETE permissions for the application role — append-only
 * is enforced at the database level.
 */
export interface PostgresWormEvidenceStore extends WormEvidenceStore {
  readonly tableName: 'evidence_worm_chain';
}

// ---------------------------------------------------------------------------
// Registration + writer cache (mirrors lib/onigaeshi/worm-store.ts)
// ---------------------------------------------------------------------------

let registeredStore: WormEvidenceStore | null = null;
let inMemoryDevStore: InMemoryWormEvidenceStore | null = null;
let cachedWriterPromise: Promise<WormEvidenceWriter> | null = null;
let cachedWriterStore: WormEvidenceStore | null = null;

/**
 * Wire a concrete `WormEvidenceStore` implementation. Production calls
 * this with a `PostgresWormEvidenceStore`; dev defaults to the in-memory
 * driver via `EVIDENCE_WORM_STORE=in-memory` (see `getEvidenceStore`).
 */
export function registerEvidenceStore(store: WormEvidenceStore): void {
  registeredStore = store;
  cachedWriterPromise = null;
  cachedWriterStore = null;
}

/** Intended for tests — clears any bootstrapped state. */
export function __resetEvidenceStoreForTests(): void {
  registeredStore = null;
  inMemoryDevStore = null;
  cachedWriterPromise = null;
  cachedWriterStore = null;
}

/**
 * Resolve the configured `WormEvidenceStore`, or null when none is
 * wired. Mirrors the audit-side `getOnigaeshiWormStore` semantics.
 */
export function getEvidenceStore(): WormEvidenceStore | null {
  if (registeredStore) return registeredStore;
  const devFlag = process.env.EVIDENCE_WORM_STORE;
  if (devFlag === 'in-memory') {
    if (!inMemoryDevStore) inMemoryDevStore = new InMemoryWormEvidenceStore();
    return inMemoryDevStore;
  }
  return null;
}

/**
 * Resolve a cached `WormEvidenceWriter` over the registered store, or
 * null when no store is wired. The writer is cached and re-used across
 * H-2 invocations; if `registerEvidenceStore` swaps the underlying
 * store, the cache invalidates and the next call rebuilds.
 *
 * Concurrency (mirrors `lib/onigaeshi/worm-store.ts` audit-side): the
 * cache stores the in-flight Promise rather than the resolved writer.
 * Two concurrent first-callers join the same construction and both
 * observe the same writer instance — preventing two writer instances
 * from racing to the same `seq` (which would produce a chain-break
 * failure that the per-instance single-flight queue cannot prevent).
 *
 * Unlike `WormAuditWriter`, the evidence writer has no async `init()` —
 * the chain tail is read on every `append`. The Promise wrapper still
 * gives us single-instance guarantees against future async work
 * (e.g. a postgres advisory-lock setup) being added without revisiting
 * this cache.
 */
export async function getEvidenceWriter(): Promise<WormEvidenceWriter | null> {
  const store = getEvidenceStore();
  if (!store) return null;
  if (cachedWriterPromise && cachedWriterStore === store) {
    return cachedWriterPromise;
  }
  cachedWriterStore = store;
  cachedWriterPromise = (async () => {
    return new WormEvidenceWriter({ store });
  })().catch((err) => {
    cachedWriterPromise = null;
    cachedWriterStore = null;
    throw err;
  });
  return cachedWriterPromise;
}
