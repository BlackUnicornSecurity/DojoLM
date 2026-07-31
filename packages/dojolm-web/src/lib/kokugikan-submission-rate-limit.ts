/**
 * Per-operator rate limit for POST /api/admin/kokugikan/submission
 * (Phase-3-A 3A.2).
 *
 * Mirrors the validation-rate-limit.ts structural pattern (check → record
 * split, in-process bucket keyed on `operatorId`, periodic cleanup,
 * retry-after seconds rounded up) but with submission-tuned constants:
 *
 *   - 600 submissions / hour / operator (≈ 10/min sustained avg, burst
 *     tolerant for a kumite batch dump).
 *   - 601st within the rolling 60-min window returns 429 with
 *     `Retry-After`.
 *   - Ledger keyed on `operatorId` (audit `user.username`), not IP.
 *
 * Multi-worker constraint inherited verbatim from validation-rate-limit:
 * the bucket is in-process. A future Redis-pubsub migration tracks under
 * YR.21+. Until then the runtime relies on the same `WEB_WORKERS === 1`
 * invariant the kill-switch + validation rate-limit already assert.
 */
const KOKUGIKAN_SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
const KOKUGIKAN_SUBMISSION_MAX = 600;
const KOKUGIKAN_SUBMISSION_MAP_CAP = 5_000;

interface KokugikanSubmissionBucket {
  readonly timestamps: readonly number[];
  lastAccess: number;
}

const submissionMap = new Map<string, KokugikanSubmissionBucket>();
let lastSubmissionCleanup = Date.now();

function cleanupSubmissionLedger(now: number): void {
  if (now - lastSubmissionCleanup < KOKUGIKAN_SUBMISSION_WINDOW_MS) {
    return;
  }

  lastSubmissionCleanup = now;
  const cutoff = now - KOKUGIKAN_SUBMISSION_WINDOW_MS;

  for (const [key, bucket] of submissionMap) {
    if (bucket.lastAccess < cutoff) {
      submissionMap.delete(key);
    }
  }

  if (submissionMap.size > KOKUGIKAN_SUBMISSION_MAP_CAP) {
    const oldest = Array.from(submissionMap.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
      .slice(0, submissionMap.size - KOKUGIKAN_SUBMISSION_MAP_CAP);

    for (const [key] of oldest) {
      submissionMap.delete(key);
    }
  }
}

function readBucketTimestamps(operatorId: string, now: number): number[] {
  cleanupSubmissionLedger(now);

  const bucket = submissionMap.get(operatorId);
  if (!bucket) return [];

  const cutoff = now - KOKUGIKAN_SUBMISSION_WINDOW_MS;
  return bucket.timestamps.filter((t) => t > cutoff);
}

export interface KokugikanSubmissionRateLimitResult {
  /** True when the operator may submit another row. */
  readonly allowed: boolean;
  /** Number of submissions already counted in the rolling 60-min window. */
  readonly currentCount: number;
  /** Window cap (always {@link KOKUGIKAN_SUBMISSION_MAX}). */
  readonly limit: number;
  /**
   * Seconds until the oldest submission in the window expires, rounded UP.
   * Only defined when `allowed === false`. Suitable for the `Retry-After`
   * header.
   */
  readonly retryAfterSeconds?: number;
}

/**
 * Check whether `operatorId` may submit another row RIGHT NOW. Pure read —
 * does not mutate the ledger. Pair with {@link recordKokugikanSubmission}
 * after the store append succeeds (we only count a submission that
 * actually persisted, so a 429-blocked attempt does not consume one of
 * the operator's slots).
 */
export function checkKokugikanSubmissionRateLimit(
  operatorId: string,
  now: number = Date.now(),
): KokugikanSubmissionRateLimitResult {
  const recent = readBucketTimestamps(operatorId, now);
  const allowed = recent.length < KOKUGIKAN_SUBMISSION_MAX;
  if (allowed) {
    return {
      allowed,
      currentCount: recent.length,
      limit: KOKUGIKAN_SUBMISSION_MAX,
    };
  }
  const oldest = recent[0];
  const expiresAt = oldest + KOKUGIKAN_SUBMISSION_WINDOW_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt - now) / 1000));
  return {
    allowed,
    currentCount: recent.length,
    limit: KOKUGIKAN_SUBMISSION_MAX,
    retryAfterSeconds,
  };
}

/**
 * Append a new timestamp to `operatorId`'s bucket. Caller MUST have
 * already gone through {@link checkKokugikanSubmissionRateLimit} and
 * confirmed the store append succeeded.
 */
export function recordKokugikanSubmission(
  operatorId: string,
  now: number = Date.now(),
): void {
  cleanupSubmissionLedger(now);

  const cutoff = now - KOKUGIKAN_SUBMISSION_WINDOW_MS;
  const existing = submissionMap.get(operatorId);
  const trimmed = existing
    ? existing.timestamps.filter((t) => t > cutoff)
    : [];
  submissionMap.set(operatorId, {
    timestamps: [...trimmed, now],
    lastAccess: now,
  });
}

/** Test-only — reset the in-process ledger between cases. */
export function resetKokugikanSubmissionRateLimiter(): void {
  submissionMap.clear();
  lastSubmissionCleanup = Date.now();
}

export const KOKUGIKAN_SUBMISSION_RATE_LIMIT = Object.freeze({
  windowMs: KOKUGIKAN_SUBMISSION_WINDOW_MS,
  max: KOKUGIKAN_SUBMISSION_MAX,
});
