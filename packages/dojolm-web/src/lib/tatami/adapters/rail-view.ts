// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/adapters/rail-view — the OSS module-adapter *consumption seam*.
 *
 * Turns a module's native source record into the read-only props the Tatami
 * Rail needs: the proof fields its header / collapsed-spine badges read, plus
 * the single read-view trace. A thin, pure pass-through over a
 * `TatamiSourceAdapter` ([types.ts](../types.ts)) — it adds no data, performs
 * no I/O, opens no write path, and touches no EE / `tatami-vault` surface.
 *
 * Any OSS module gets a Rail mount by pairing its adapter with this helper
 * (Scanner first, then Buki / Jutsu / … per Epic 11). The Rail stays purely
 * presentational; the module adapter stays the only place a native record is
 * mapped. Nothing here is invented: the badge axes are exactly the ones the
 * adapter populated, so `<TatamiProofBadges>` degrades honestly.
 */

import type { TatamiProof, TatamiSourceAdapter, TatamiTraceEvent } from '../types';

/**
 * Read-only Rail projection of one source record.
 *
 * `proof` is the adapter's `Partial<TatamiProof>` — feed it straight into
 * `<TatamiProofBadges proof={…} />`; it renders a badge only for an axis the
 * adapter actually produced and never fabricates one. `trace` is the adapter's
 * read-view events (the Scanner adapter yields a SINGLE synthetic run event;
 * a multi-step event stream is a new write path and is out of OSS v0).
 */
export interface TatamiRailView {
  readonly proof: Partial<TatamiProof>;
  readonly trace: readonly TatamiTraceEvent[];
}

/**
 * Project a source record into Rail props via its module adapter. Pure: the
 * record is read, never mutated, and no fetch / clock / secret is touched.
 */
export function toRailView<TSourceRecord>(
  adapter: TatamiSourceAdapter<TSourceRecord>,
  record: TSourceRecord,
): TatamiRailView {
  return {
    proof: adapter.toProof(record),
    trace: adapter.toTrace(record),
  };
}
