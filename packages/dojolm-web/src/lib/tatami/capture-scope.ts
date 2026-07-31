// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/capture-scope — H-1 operator-scope guard for the capture route.
 *
 * The scan-runs store is org-AGNOSTIC today: a `ScanRunRecord` carries no `orgId`, only
 * a per-caller `operator` hash. Once a second org's runs coexist in that shared store,
 * an unscoped `getById(runId)` lets operator-A capture operator-B's run into A's
 * org-scoped proof store and read it back (an IDOR). Until scan-runs grows a real
 * `orgId` column (FUTURE: SCAN-RUNS-ORG-COLUMN), the tightest available isolation is the
 * operator hash the run was persisted with — so the capture route asserts the run
 * belongs to the calling operator before filing it as evidence.
 *
 * `buildScanRunRecord` stores `operator = sha256(<request-operator-string>)` — the
 * `hashOperatorForAuditLog` form in `/api/scan`, over the string `api-key:<key>` or
 * `session:<cookie>` returned by `resolveRequestOperator`. This module recomputes that
 * SAME hash so the two values can be compared. (That input is a high-entropy bearer, so
 * an un-keyed digest is sufficient here — see the note on `hashTatamiOwner`.)
 */

import { createHash } from 'node:crypto';
import type { ScanRunRecord } from '../scan-runs/types';

/**
 * Recompute the scan-runs `operator` hash from a request-operator string. Mirrors
 * `/api/scan`'s `hashOperatorForAuditLog` (sha256 hex) so the result equals the value
 * `buildScanRunRecord` persisted for the same caller.
 */
export function hashScanRunOperator(requestOperator: string): string {
  return createHash('sha256').update(requestOperator).digest('hex');
}

/**
 * True iff `record` was produced by the operator identified by `requestOperator` (the
 * raw string from `resolveRequestOperator`, e.g. `api-key:<key>`). FAIL CLOSED: a
 * null/blank `requestOperator` — no resolvable caller identity — can never match, so an
 * unattributable request can never capture another operator's run.
 */
export function scanRunBelongsToOperator(
  record: ScanRunRecord,
  requestOperator: string | null,
): boolean {
  if (!requestOperator) return false;
  return record.operator === hashScanRunOperator(requestOperator);
}
