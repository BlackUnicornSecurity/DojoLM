// SPDX-License-Identifier: Apache-2.0
/**
 * scan-runs/factory — HAGANE E2.S1a. Env-selected store singleton
 * (sibling pattern: kill-switch/budget factories).
 *
 *   SCAN_RUNS_STORE=jsonl      (default — node runtime)
 *   SCAN_RUNS_STORE=in-memory  (tests / ephemeral dev)
 */

import { JsonlScanRunsStore } from './jsonl-store';
import { InMemoryScanRunsStore } from './memory-store';
import type { ScanRunsStore } from './types';

let memo: ScanRunsStore | null = null;

function resolveMode(): 'jsonl' | 'in-memory' {
  const explicit = process.env.SCAN_RUNS_STORE;
  if (explicit === 'in-memory') return 'in-memory';
  if (explicit === 'jsonl') return 'jsonl';
  // Hermetic default under vitest — route tests must never write the
  // real data path.
  return process.env.NODE_ENV === 'test' ? 'in-memory' : 'jsonl';
}

export function getScanRunsStore(): ScanRunsStore {
  if (memo !== null) return memo;
  memo =
    resolveMode() === 'in-memory'
      ? new InMemoryScanRunsStore()
      : new JsonlScanRunsStore();
  return memo;
}

/** Test seam only. */
export function __resetScanRunsStoreForTests(): void {
  memo = null;
}
