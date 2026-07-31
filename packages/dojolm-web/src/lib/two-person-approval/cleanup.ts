// SPDX-License-Identifier: Apache-2.0
/**
 * Lazy cleanup of expired pending approvals. Called from each /submit,
 * /confirm, /reject route hot path — runs at most once per
 * `CLEANUP_THROTTLE_MS` so request latency stays predictable.
 */

import { twoPersonApprovalRepo } from '@/lib/db/repositories/two-person-approval.repository';
import { CLEANUP_THROTTLE_MS } from './constants';

let lastCleanupAtMs = 0;

/**
 * Cleanup expired approvals if the last cleanup was older than the
 * throttle window. Idempotent: concurrent requests in the same window
 * see lastCleanupAtMs already advanced and skip the DELETE.
 *
 * Returns the row count purged, or null if the cleanup was throttled
 * (so callers can distinguish "ran, nothing to do" from "skipped").
 */
export function maybeCleanupExpiredApprovals(): number | null {
  const now = Date.now();
  if (now - lastCleanupAtMs < CLEANUP_THROTTLE_MS) {
    return null;
  }
  // Update before the DELETE so a concurrent caller short-circuits.
  lastCleanupAtMs = now;
  return twoPersonApprovalRepo.cleanExpired();
}

/** Test-only: reset the throttle so each test starts from a clean slate. */
export function __resetCleanupThrottleForTests(): void {
  lastCleanupAtMs = 0;
}
