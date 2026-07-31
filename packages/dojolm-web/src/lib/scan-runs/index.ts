// SPDX-License-Identifier: Apache-2.0
/** scan-runs — HAGANE E2.S1a barrel. */

export {
  buildScanRunRecord,
  isScanRunRecord,
  MAX_PERSISTED_FINDINGS,
  type BuildScanRunInput,
  type ScannerFindingInput,
} from './record';
export { getScanRunsStore, __resetScanRunsStoreForTests } from './factory';
export { InMemoryScanRunsStore } from './memory-store';
export { JsonlScanRunsStore, MAX_ROW_BYTES } from './jsonl-store';
export {
  toSummary,
  type ScanRunFinding,
  type ScanRunRecord,
  type ScanRunsStore,
  type ScanRunSummary,
} from './types';
