// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store — org-scoped Tatami proof + case persistence (OSS, Epic 1 / PR-3 / PR-3b).
 */

export type {
  TatamiProofStore,
  TatamiProofPage,
  TatamiProofRetentionSource,
  TatamiProofSummary,
  TatamiEraseOptions,
  TatamiEraseResult,
} from './types';
export { toProofSummary } from './types';
export { JsonlTatamiProofStore, MAX_ROW_BYTES } from './jsonl-store';
export { InMemoryTatamiProofStore } from './memory-store';
export {
  getTatamiProofStore,
  getTatamiProofRetentionSource,
  __resetTatamiProofStoreForTests,
} from './factory';

// ── Org-scoped case store (B5) ───────────────────────────────────────────────
export type { TatamiCaseStore, TatamiCasePage, TatamiCaseSummary } from './case-types';
export { toCaseSummary } from './case-types';
export { JsonlTatamiCaseStore } from './case-jsonl-store';
export { InMemoryTatamiCaseStore } from './case-memory-store';
export {
  getTatamiCaseStore,
  __resetTatamiCaseStoreForTests,
} from './case-factory';
