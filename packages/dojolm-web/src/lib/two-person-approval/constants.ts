// SPDX-License-Identifier: Apache-2.0
/**
 * Constants for the YR.13.3 two-person-approval state machine.
 */

/** Pending approval lifetime: 5 minutes from submit. Strict (no skew). */
export const APPROVAL_TTL_MS = 5 * 60 * 1000;

/** Code length in raw bytes. 5 bytes → 40 bits → 8 base32 chars. */
export const APPROVAL_CODE_BYTES = 5;

/** Rate-limit window per primary operator (per-process in-memory). */
export const SUBMIT_RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Max pending submits per operator within the rate-limit window. */
export const SUBMIT_RATE_LIMIT_MAX = 5;

/** Min interval between cleanExpired sweeps. Sweeps run lazily on every
 *  hot-path request, but only when the last sweep was older than this. */
export const CLEANUP_THROTTLE_MS = 5 * 60 * 1000;

/** Max rows ever returned from listPending — defensive cap against
 *  unbounded reads. */
export const PENDING_LIST_MAX_ROWS = 200;
