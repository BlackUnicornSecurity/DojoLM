// SPDX-License-Identifier: Apache-2.0
/**
 * File: ingestion-batch.ts
 * Purpose: In-memory batch primitive + rollback-by-batch-id registry for
 *   community-feed ingestion. Persistence layer is deliberately pluggable
 *   (see `BatchStore`); the default is an in-process store useful for the
 *   scheduler + tests.
 * Story: Gap 2 (plan lines 318–322, 329)
 *
 * A "batch" is the atomic unit of upstream pull. Every payload accepted by
 * `dna-ingester.ingestCommunityPayload()` must carry a `batchId`. Rollback
 * removes every payload tagged with that id and is idempotent — calling
 * `rollbackBatch` twice with the same id must not double-delete or throw.
 */

import { createHash, randomUUID } from 'crypto';
import type { MasterThreatEntry } from './types.js';

/** Status lifecycle for a batch. */
export type BatchStatus = 'pending' | 'accepted' | 'quarantined' | 'rolled-back';

export interface IngestionBatch {
  readonly batchId: string;
  readonly sourceId: string;
  /** Upstream commit SHA recorded per plan line 329 (commit-hash pinning). */
  readonly upstreamCommit: string | null;
  readonly createdAt: string;
  status: BatchStatus;
  /** Payload ids that landed under this batch. */
  readonly payloadIds: string[];
  /** Reason code if quarantined. */
  quarantineReason: string | null;
  /** ISO timestamp of rollback, if any. */
  rolledBackAt: string | null;
}

/**
 * Pluggable storage. The in-process implementation is sufficient for the
 * scheduler + tests; dojolm-web wraps it with a file/DB backed impl when
 * it needs durability.
 */
export interface BatchStore {
  create(input: { readonly sourceId: string; readonly upstreamCommit: string | null }): IngestionBatch;
  get(batchId: string): IngestionBatch | null;
  list(filter?: { readonly sourceId?: string; readonly status?: BatchStatus }): readonly IngestionBatch[];
  markQuarantined(batchId: string, reason: string): void;
  markAccepted(batchId: string): void;
  markRolledBack(batchId: string): void;
  addPayload(batchId: string, payloadId: string): void;
  /** Remove a batch record entirely. Used by tests. */
  clear(): void;
}

/**
 * In-memory BatchStore. Immutable-at-the-edges — every returned record
 * is a fresh object so callers can't mutate internal state.
 */
export class InMemoryBatchStore implements BatchStore {
  private readonly batches = new Map<string, IngestionBatch>();

  create(input: { readonly sourceId: string; readonly upstreamCommit: string | null }): IngestionBatch {
    const batchId = randomUUID();
    const record: IngestionBatch = {
      batchId,
      sourceId: input.sourceId,
      upstreamCommit: input.upstreamCommit,
      createdAt: new Date().toISOString(),
      status: 'pending',
      payloadIds: [],
      quarantineReason: null,
      rolledBackAt: null,
    };
    this.batches.set(batchId, record);
    return this.snapshot(record);
  }

  get(batchId: string): IngestionBatch | null {
    const record = this.batches.get(batchId);
    return record ? this.snapshot(record) : null;
  }

  list(filter?: { readonly sourceId?: string; readonly status?: BatchStatus }): readonly IngestionBatch[] {
    const out: IngestionBatch[] = [];
    for (const record of this.batches.values()) {
      if (filter?.sourceId && record.sourceId !== filter.sourceId) continue;
      if (filter?.status && record.status !== filter.status) continue;
      out.push(this.snapshot(record));
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  markQuarantined(batchId: string, reason: string): void {
    const record = this.batches.get(batchId);
    if (!record) return;
    record.status = 'quarantined';
    record.quarantineReason = reason;
  }

  markAccepted(batchId: string): void {
    const record = this.batches.get(batchId);
    if (!record) return;
    if (record.status === 'rolled-back') return;
    record.status = 'accepted';
  }

  markRolledBack(batchId: string): void {
    const record = this.batches.get(batchId);
    if (!record) return;
    record.status = 'rolled-back';
    record.rolledBackAt = new Date().toISOString();
  }

  addPayload(batchId: string, payloadId: string): void {
    const record = this.batches.get(batchId);
    if (!record) return;
    if (!record.payloadIds.includes(payloadId)) {
      record.payloadIds.push(payloadId);
    }
  }

  clear(): void {
    this.batches.clear();
  }

  private snapshot(record: IngestionBatch): IngestionBatch {
    return {
      ...record,
      payloadIds: [...record.payloadIds],
    };
  }
}

/**
 * Pluggable payload repository. Lets callers wire their actual persistence
 * (file, sqlite, pg) without this module knowing about it.
 */
export interface PayloadRepository {
  /** Persist a payload tagged with its batch id. Returns the payload id (idempotent by content hash). */
  insert(entry: MasterThreatEntry, batchId: string): string;
  /** Remove every payload tagged with `batchId`. Returns count removed. */
  deleteByBatch(batchId: string): number;
  /** Read back a payload by id, for list/filter endpoints. */
  get(payloadId: string): MasterThreatEntry | null;
  /** Iterate payloads under a batch (for community-list API). */
  listByBatch(batchId: string): readonly MasterThreatEntry[];
  /** Content-hash dedupe probe. */
  hasContentHash(contentHash: string): boolean;
  /** Clear all (tests). */
  clear(): void;
}

export class InMemoryPayloadRepository implements PayloadRepository {
  private readonly byId = new Map<string, { readonly entry: MasterThreatEntry; readonly batchId: string }>();
  private readonly byContentHash = new Map<string, string>();

  insert(entry: MasterThreatEntry, batchId: string): string {
    // Idempotent by content hash: if we've seen the hash before, return
    // the existing id instead of creating a duplicate row.
    const existingId = this.byContentHash.get(contentHashFor(entry));
    if (existingId) return existingId;
    this.byId.set(entry.id, { entry, batchId });
    this.byContentHash.set(contentHashFor(entry), entry.id);
    return entry.id;
  }

  deleteByBatch(batchId: string): number {
    let removed = 0;
    for (const [id, record] of this.byId) {
      if (record.batchId === batchId) {
        this.byId.delete(id);
        this.byContentHash.delete(contentHashFor(record.entry));
        removed++;
      }
    }
    return removed;
  }

  get(payloadId: string): MasterThreatEntry | null {
    const record = this.byId.get(payloadId);
    return record ? record.entry : null;
  }

  listByBatch(batchId: string): readonly MasterThreatEntry[] {
    const out: MasterThreatEntry[] = [];
    for (const record of this.byId.values()) {
      if (record.batchId === batchId) out.push(record.entry);
    }
    return out;
  }

  hasContentHash(contentHash: string): boolean {
    return this.byContentHash.has(contentHash);
  }

  clear(): void {
    this.byId.clear();
    this.byContentHash.clear();
  }
}

/**
 * Content-hash helper. Consumers usually set `entry.id` from the hash
 * upstream, but this is the canonical reference for dedupe.
 */
export function contentHashFor(entry: Pick<MasterThreatEntry, 'rawContent' | 'sourceId'>): string {
  return simpleHash(`${entry.sourceId}::${entry.rawContent}`);
}

/**
 * SHA-256 content hash rendered as lowercase hex. Used for dedupe across
 * and within community-feed batches. Collision resistance matters because
 * an attacker controlling a public feed could otherwise craft two payloads
 * sharing a hash, causing the second to bypass the R-C1 sanitizer chain
 * as if it had already been accepted.
 */
export function simpleHash(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Rollback is idempotent by construction:
 *
 * 1. Payload deletion: the repository skips missing rows silently.
 * 2. Status transition: subsequent calls re-run the no-op mark and emit
 *    `removed: 0` through the returned `RollbackResult`.
 */
export interface RollbackResult {
  readonly batchId: string;
  readonly removed: number;
  readonly alreadyRolledBack: boolean;
}

export function rollbackBatchWithStores(
  batchId: string,
  batches: BatchStore,
  payloads: PayloadRepository,
): RollbackResult {
  const batch = batches.get(batchId);
  if (!batch) {
    return { batchId, removed: 0, alreadyRolledBack: true };
  }
  if (batch.status === 'rolled-back') {
    return { batchId, removed: 0, alreadyRolledBack: true };
  }
  const removed = payloads.deleteByBatch(batchId);
  batches.markRolledBack(batchId);
  return { batchId, removed, alreadyRolledBack: false };
}
