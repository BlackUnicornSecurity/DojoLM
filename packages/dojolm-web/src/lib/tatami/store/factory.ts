// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store/factory — env-selected proof-store singleton (sibling pattern:
 * scan-runs/factory).
 *
 *   TATAMI_STORE=jsonl      (default — node runtime)
 *   TATAMI_STORE=in-memory  (tests / ephemeral dev)
 *
 * Hermetic default under vitest: store/route tests must never write the real
 * data path. The retention source is the SAME singleton exposed through a
 * separate, non-org-scoped accessor (see store/types).
 */

import { JsonlTatamiProofStore } from './jsonl-store';
import { InMemoryTatamiProofStore } from './memory-store';
import type { TatamiProofRetentionSource, TatamiProofStore } from './types';

type TatamiStore = TatamiProofStore & TatamiProofRetentionSource;

let memo: TatamiStore | null = null;

function resolveMode(): 'jsonl' | 'in-memory' {
  const explicit = process.env.TATAMI_STORE;
  if (explicit === 'in-memory') return 'in-memory';
  if (explicit === 'jsonl') return 'jsonl';
  // Hermetic default under vitest — tests must never write the real data path.
  return process.env.NODE_ENV === 'test' ? 'in-memory' : 'jsonl';
}

function getStore(): TatamiStore {
  if (memo !== null) return memo;
  memo =
    resolveMode() === 'in-memory'
      ? new InMemoryTatamiProofStore()
      : new JsonlTatamiProofStore();
  return memo;
}

/** Tenant-facing, org-scoped proof store (B5). */
export function getTatamiProofStore(): TatamiProofStore {
  return getStore();
}

/** Retention-only, NOT org-scoped — operator housekeeping (see store/types). */
export function getTatamiProofRetentionSource(): TatamiProofRetentionSource {
  return getStore();
}

/** Test seam only. */
export function __resetTatamiProofStoreForTests(): void {
  memo = null;
}
