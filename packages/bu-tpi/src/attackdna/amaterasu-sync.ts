// SPDX-License-Identifier: Apache-2.0
/**
 * File: amaterasu-sync.ts
 * Purpose: High-level orchestrator for Gap 2 community-feed ingestion.
 * Story: Gap 2 (plan lines 333-341)
 *
 * Public API mandated by the plan:
 *   syncLiberatorFeed(source): Promise<IngestReport>
 *   rollbackBatch(batchId): Promise<void>
 *   listCommunityPayloads(filter): AsyncIterable<MasterThreatEntry>
 *
 * Flow:
 *   1. Create a pending batch (records upstream commit SHA when provided).
 *   2. Fetch + parse the feed via the source's adapter.
 *   3. Run the quarantine anomaly detector (size spike + unknown-category
 *      ratio). On trigger: mark batch quarantined, drop it, done.
 *   4. For each parsed payload: pass through fixture-ingest-analyzer +
 *      sanitizer (inside `ingestCommunityPayload`), dedupe by content
 *      hash, persist.
 *   5. Mark batch accepted, return report.
 *
 * Kill-switch: caller wires a `CancellationToken` from the `KILL_AMATERASU`
 * registry subscription; this module cooperatively aborts between sources
 * and between payloads (plan line 330).
 */

import type { MasterThreatEntry } from './types.js';
import {
  getAdapter,
  RateLimitError,
  type MasterSourceAdapter,
} from './master-sources.js';
import {
  InMemoryBatchStore,
  InMemoryPayloadRepository,
  rollbackBatchWithStores,
  type BatchStore,
  type IngestionBatch,
  type PayloadRepository,
  type RollbackResult,
} from './ingestion-batch.js';
import { ingestCommunityPayload } from './dna-ingester.js';
import { evaluateBatch } from './quarantine.js';
import {
  CancellationToken,
  KillSwitchAbort,
} from '../flags/kill-switch.js';

export type LiberatorSource =
  | 'l1b3rt4s-primary'
  | 'l1b3rt4s-mirror'
  | 'basi-prompt'
  | 'hf-jailbreak';

export const LIBERATOR_SOURCES: readonly LiberatorSource[] = [
  'l1b3rt4s-primary',
  'l1b3rt4s-mirror',
  'basi-prompt',
  'hf-jailbreak',
] as const;

export interface IngestReport {
  readonly sourceId: string;
  readonly batchId: string;
  readonly status: 'accepted' | 'quarantined' | 'aborted' | 'rate-limited' | 'error';
  readonly upstreamCommit: string | null;
  readonly fetched: number;
  readonly accepted: number;
  readonly deduped: number;
  readonly quarantined: number;
  readonly durationMs: number;
  readonly quarantineReason?: string;
  readonly error?: string;
}

export interface PayloadFilter {
  readonly sourceId?: string;
  readonly batchId?: string;
  readonly category?: string;
  readonly limit?: number;
}

export interface SyncOptions {
  /** Override the adapter used (for tests). */
  readonly adapter?: MasterSourceAdapter;
  /** Cancellation token tied to `KILL_AMATERASU`. */
  readonly cancellation?: CancellationToken;
  /** Upstream commit SHA to record (deploy pipeline resolves this). */
  readonly upstreamCommit?: string | null;
  /** Rolling baseline batch size per source (for spike detection). */
  readonly baselineSize?: number | null;
  /** Telemetry emitter. */
  readonly onTelemetry?: (event: AmaterasuTelemetryEvent) => void;
}

export type AmaterasuTelemetryEvent =
  | {
      readonly type: 'amaterasu.feed.sync';
      readonly sourceId: string;
      readonly batchId: string;
      readonly upstreamCommit: string | null;
      readonly fetched: number;
      readonly accepted: number;
      readonly deduped: number;
      readonly quarantined: number;
      readonly durationMs: number;
    }
  | {
      readonly type: 'amaterasu.batch.quarantined';
      readonly sourceId: string;
      readonly batchId: string;
      readonly reason: string;
      readonly metric: number;
      readonly threshold: number;
    }
  | {
      readonly type: 'amaterasu.rollback.executed';
      readonly batchId: string;
      readonly removed: number;
      readonly actor: string;
    };

// ---------------------------------------------------------------------------
// Singleton stores (default) + DI seam for tests.
// ---------------------------------------------------------------------------

let defaultBatchStore: BatchStore = new InMemoryBatchStore();
let defaultPayloadRepo: PayloadRepository = new InMemoryPayloadRepository();

export function getDefaultStores(): { readonly batches: BatchStore; readonly payloads: PayloadRepository } {
  return { batches: defaultBatchStore, payloads: defaultPayloadRepo };
}

export function setDefaultStores(stores: { readonly batches: BatchStore; readonly payloads: PayloadRepository }): void {
  defaultBatchStore = stores.batches;
  defaultPayloadRepo = stores.payloads;
}

export function resetDefaultStores(): void {
  defaultBatchStore = new InMemoryBatchStore();
  defaultPayloadRepo = new InMemoryPayloadRepository();
}

// ---------------------------------------------------------------------------
// syncLiberatorFeed
// ---------------------------------------------------------------------------

export async function syncLiberatorFeed(
  source: LiberatorSource,
  options: SyncOptions = {},
): Promise<IngestReport> {
  const start = Date.now();
  const adapter = options.adapter ?? getAdapter(source);
  if (!adapter) {
    return {
      sourceId: source,
      batchId: '',
      status: 'error',
      upstreamCommit: options.upstreamCommit ?? null,
      fetched: 0,
      accepted: 0,
      deduped: 0,
      quarantined: 0,
      durationMs: Date.now() - start,
      error: `unknown source: ${source}`,
    };
  }

  const { batches, payloads } = getDefaultStores();
  const batch = batches.create({ sourceId: source, upstreamCommit: options.upstreamCommit ?? null });

  try {
    options.cancellation?.throwIfCancelled();
    const raw = await adapter.fetch();
    options.cancellation?.throwIfCancelled();

    const entries = adapter.parse(raw);
    options.cancellation?.throwIfCancelled();

    const labels = entries.map((e) => (e.indicators.length > 0 ? e.indicators : [e.category]));
    const verdict = evaluateBatch({
      sourceId: source,
      size: entries.length,
      labels,
      baselineSize: options.baselineSize ?? null,
    });

    if (verdict.kind === 'quarantine') {
      batches.markQuarantined(batch.batchId, verdict.reason);
      options.onTelemetry?.({
        type: 'amaterasu.batch.quarantined',
        sourceId: source,
        batchId: batch.batchId,
        reason: verdict.reason,
        metric: verdict.metric,
        threshold: verdict.threshold,
      });
      const report: IngestReport = {
        sourceId: source,
        batchId: batch.batchId,
        status: 'quarantined',
        upstreamCommit: batch.upstreamCommit,
        fetched: entries.length,
        accepted: 0,
        deduped: 0,
        quarantined: entries.length,
        durationMs: Date.now() - start,
        quarantineReason: verdict.reason,
      };
      options.onTelemetry?.({
        type: 'amaterasu.feed.sync',
        sourceId: source,
        batchId: batch.batchId,
        upstreamCommit: batch.upstreamCommit,
        fetched: entries.length,
        accepted: 0,
        deduped: 0,
        quarantined: entries.length,
        durationMs: report.durationMs,
      });
      return report;
    }

    let accepted = 0;
    let deduped = 0;
    let quarantinedCount = 0;

    // Intra-batch dedupe: the persistent store only sees a payload after
    // `payloads.insert` below, so within a single sync the ingester would
    // accept two identical rows from the same feed fetch. Track hashes
    // seen in this batch locally so duplicates inside the same pull are
    // caught before the sanitizer chain runs twice on identical content.
    const batchSeen = new Set<string>();
    const seenHashes = {
      has: (hash: string): boolean =>
        batchSeen.has(hash) || payloads.hasContentHash(hash),
      add: (hash: string, _id: string): void => {
        batchSeen.add(hash);
      },
    };

    for (const entry of entries) {
      options.cancellation?.throwIfCancelled();
      const result = ingestCommunityPayload({ entry, batchId: batch.batchId }, seenHashes);
      if (result.kind === 'duplicate') {
        deduped++;
        continue;
      }
      if (result.kind === 'quarantined') {
        quarantinedCount++;
        continue;
      }
      const insertedId = payloads.insert(entry, batch.batchId);
      batches.addPayload(batch.batchId, insertedId);
      accepted++;
    }

    batches.markAccepted(batch.batchId);
    const durationMs = Date.now() - start;
    options.onTelemetry?.({
      type: 'amaterasu.feed.sync',
      sourceId: source,
      batchId: batch.batchId,
      upstreamCommit: batch.upstreamCommit,
      fetched: entries.length,
      accepted,
      deduped,
      quarantined: quarantinedCount,
      durationMs,
    });

    return {
      sourceId: source,
      batchId: batch.batchId,
      status: 'accepted',
      upstreamCommit: batch.upstreamCommit,
      fetched: entries.length,
      accepted,
      deduped,
      quarantined: quarantinedCount,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    if (err instanceof KillSwitchAbort) {
      batches.markQuarantined(batch.batchId, 'killswitch-abort');
      return {
        sourceId: source,
        batchId: batch.batchId,
        status: 'aborted',
        upstreamCommit: batch.upstreamCommit,
        fetched: 0,
        accepted: 0,
        deduped: 0,
        quarantined: 0,
        durationMs,
        error: err.message,
      };
    }
    if (err instanceof RateLimitError) {
      batches.markQuarantined(batch.batchId, 'rate-limited');
      return {
        sourceId: source,
        batchId: batch.batchId,
        status: 'rate-limited',
        upstreamCommit: batch.upstreamCommit,
        fetched: 0,
        accepted: 0,
        deduped: 0,
        quarantined: 0,
        durationMs,
        error: err.message,
      };
    }
    batches.markQuarantined(batch.batchId, 'fetch-error');
    return {
      sourceId: source,
      batchId: batch.batchId,
      status: 'error',
      upstreamCommit: batch.upstreamCommit,
      fetched: 0,
      accepted: 0,
      deduped: 0,
      quarantined: 0,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// rollbackBatch (idempotent)
// ---------------------------------------------------------------------------

export async function rollbackBatch(
  batchId: string,
  options: { readonly actor?: string; readonly onTelemetry?: (event: AmaterasuTelemetryEvent) => void } = {},
): Promise<RollbackResult> {
  const { batches, payloads } = getDefaultStores();
  const result = rollbackBatchWithStores(batchId, batches, payloads);
  options.onTelemetry?.({
    type: 'amaterasu.rollback.executed',
    batchId,
    removed: result.removed,
    actor: options.actor ?? 'unknown',
  });
  return result;
}

// ---------------------------------------------------------------------------
// listCommunityPayloads
// ---------------------------------------------------------------------------

export async function* listCommunityPayloads(
  filter: PayloadFilter = {},
): AsyncIterable<MasterThreatEntry> {
  const { batches, payloads } = getDefaultStores();
  const targetBatches = batches.list(
    filter.sourceId || filter.batchId
      ? { sourceId: filter.sourceId, status: undefined }
      : undefined,
  );
  let emitted = 0;
  const limit = filter.limit ?? Infinity;
  for (const batch of targetBatches) {
    if (filter.batchId && batch.batchId !== filter.batchId) continue;
    if (batch.status === 'rolled-back' || batch.status === 'quarantined') continue;
    for (const entry of payloads.listByBatch(batch.batchId)) {
      if (filter.category && entry.category !== filter.category) continue;
      if (emitted >= limit) return;
      emitted++;
      yield entry;
    }
  }
}

/** List active (non-rolled-back, non-quarantined) batches. */
export function listBatches(filter?: { readonly sourceId?: string }): readonly IngestionBatch[] {
  const { batches } = getDefaultStores();
  return batches.list(filter);
}
