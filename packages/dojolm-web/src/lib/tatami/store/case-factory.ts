// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store/case-factory — env-selected case-store singleton (sibling of the
 * proof-store factory). Reads the SAME `TATAMI_STORE` knob, so the proof + case
 * stores always share one persistence posture:
 *
 *   TATAMI_STORE=jsonl      (default — node runtime)
 *   TATAMI_STORE=in-memory  (tests / ephemeral dev)
 *
 * Hermetic default under vitest — store tests must never write the real data path.
 */

import { JsonlTatamiCaseStore } from './case-jsonl-store';
import { InMemoryTatamiCaseStore } from './case-memory-store';
import type { TatamiCaseStore } from './case-types';

let memo: TatamiCaseStore | null = null;

function resolveMode(): 'jsonl' | 'in-memory' {
  const explicit = process.env.TATAMI_STORE;
  if (explicit === 'in-memory') return 'in-memory';
  if (explicit === 'jsonl') return 'jsonl';
  // Hermetic default under vitest — tests must never write the real data path.
  return process.env.NODE_ENV === 'test' ? 'in-memory' : 'jsonl';
}

function getStore(): TatamiCaseStore {
  if (memo !== null) return memo;
  memo =
    resolveMode() === 'in-memory'
      ? new InMemoryTatamiCaseStore()
      : new JsonlTatamiCaseStore();
  return memo;
}

/** Tenant-facing, org-scoped case store (B5). */
export function getTatamiCaseStore(): TatamiCaseStore {
  return getStore();
}

/** Test seam only. */
export function __resetTatamiCaseStoreForTests(): void {
  memo = null;
}
