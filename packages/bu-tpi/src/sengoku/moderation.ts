// SPDX-License-Identifier: Apache-2.0
/**
 * File: sengoku/moderation.ts
 * Purpose: Gap 9 — submission-approval state machine for the members-only
 *          leaderboard. Pending submissions enter a Moderator-reviewed
 *          queue; transitions are `pending → approved` or
 *          `pending → rejected`. Terminal states are immutable.
 * Story: Industry-tools parity plan §9 (lines 540–578)
 *
 * This module is the narrowly-scoped moderation delta on top of the
 * already-shipped public leaderboard (GET/POST at
 * `/api/llm/leaderboard`). It does NOT re-implement the leaderboard
 * itself and it does NOT ship the maximal Gap 9 surface (hard-block,
 * two-person rule, Wilson CI, percentile scoring) — those remain open
 * follow-on scope tracked in the spec. What ships here:
 *
 *   1. Pure in-memory state machine (`pending → approved | rejected`).
 *   2. Moderator-actor self-review interlock (reviewer may not be the
 *      submitter).
 *   3. Terminal-state immutability — once approved/rejected, no further
 *      transitions.
 *   4. Append-only audit log (drainable in-process) + optional
 *      `onTelemetry` bridge, matching the discipline from #180
 *      arena/season.ts.
 *
 * Security (post-#176 lesson, reinforced in #180):
 * - Submission id must match a filename-safe grammar
 *   ([a-z0-9][a-z0-9._-]*) so it never smuggles control chars into logs
 *   or telemetry. Actor / submitter ids are length-bounded and strip
 *   control chars.
 * - `reason` strings on rejection are length-capped and control-char
 *   stripped before they land in the audit log. They are NEVER surfaced
 *   in telemetry (R-T1: no payload in telemetry).
 * - All entries returned from the module are frozen; callers cannot
 *   mutate module state.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface ModerationSubmission {
  readonly id: string;
  readonly submitterId: string;
  readonly modelId: string;
  readonly status: ModerationStatus;
  readonly createdAt: string;
  readonly reviewedAt: string | null;
  readonly reviewerId: string | null;
  readonly reason: string | null;
}

export interface SubmitInput {
  readonly id: string;
  readonly submitterId: string;
  readonly modelId: string;
}

export type ReviewDecision =
  | { readonly decision: 'approve' }
  | { readonly decision: 'reject'; readonly reason: string };

export interface ModerationAuditEntry {
  readonly submissionId: string;
  readonly type:
    | 'submission.received'
    | 'submission.approved'
    | 'submission.rejected';
  readonly actor: string;
  readonly timestamp: string;
  readonly detail: Record<string, string | number | boolean | null>;
}

export type ModerationTelemetryEvent =
  | {
      readonly type: 'leaderboard.submission.received';
      readonly submissionId: string;
      readonly modelId: string;
    }
  | {
      readonly type: 'leaderboard.submission.reviewed';
      readonly submissionId: string;
      readonly decision: 'approve' | 'reject';
    };

export interface ModerationOptions {
  readonly actor?: string;
  readonly now?: () => Date;
  /**
   * Post-#182 L-02 — telemetry/throw ordering contract:
   *
   * The state-machine functions (`submit`, `review`) throw on validation
   * failure BEFORE calling `onTelemetry`. Callers may therefore safely
   * assume:
   *   1. Validation throws → no telemetry emitted, no audit row written.
   *   2. Validation passes → audit row appended → telemetry emitted.
   *
   * Telemetry emission is best-effort: if `onTelemetry` itself throws,
   * the exception is NOT swallowed — the caller's transition has already
   * mutated audit log + store, and the throw will propagate out of
   * `submit`/`review`. Callers that want to absorb telemetry failures
   * MUST wrap their emitter in try/catch (see the Next.js route bridge
   * in `app/api/admin/leaderboard/moderation/route.ts`).
   */
  readonly onTelemetry?: (event: ModerationTelemetryEvent) => void;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const MAX_REASON_LENGTH = 512;

function isSafeId(id: string, max: number): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > max) return false;
  return ID_RE.test(id);
}

// Bidi-override / zero-width / format codepoints (extended post-#185 audit):
// U+200B-U+200F, U+2028-U+202F, U+2066-U+2069, U+FEFF.
const BIDI_CHARCLASS_SRC = '\\u200B-\\u200F\\u2028-\\u202F\\u2066-\\u2069\\uFEFF';

function isSafeActorId(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 128) return false;
  // eslint-disable-next-line no-control-regex
  if (new RegExp(`[\\u0000-\\u001f\\u007f${BIDI_CHARCLASS_SRC}]`).test(id)) return false;
  return true;
}

function sanitiseReason(raw: string): string {
  if (typeof raw !== 'string') {
    throw new Error('reason must be a string');
  }
  if (raw.length === 0) {
    throw new Error('reason must not be empty');
  }
  if (raw.length > MAX_REASON_LENGTH) {
    throw new Error(`reason must be <= ${MAX_REASON_LENGTH} chars`);
  }
  const stripped = raw.replace(
    // eslint-disable-next-line no-control-regex
    new RegExp(`[\\u0000-\\u001f\\u007f${BIDI_CHARCLASS_SRC}]`, 'g'),
    '',
  );
  if (stripped.length === 0) {
    throw new Error('reason must not be empty after control-char strip');
  }
  return stripped;
}

// ---------------------------------------------------------------------------
// Store (in-memory; swap behind persistence when Gap 9 expands)
// ---------------------------------------------------------------------------

const submissions = new Map<string, ModerationSubmission>();
const auditLog: ModerationAuditEntry[] = [];

function resolveNow(opts: ModerationOptions | undefined): string {
  const d = opts?.now ? opts.now() : new Date();
  return d.toISOString();
}

function appendAudit(entry: ModerationAuditEntry): void {
  auditLog.push(Object.freeze({ ...entry, detail: Object.freeze({ ...entry.detail }) }));
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Receive a submission into the moderation queue in `pending` status.
 * Duplicate ids are rejected — the caller must generate a fresh id per
 * submission (mirrors the arena/season create semantics).
 */
export function submit(
  input: SubmitInput,
  options: ModerationOptions = {},
): ModerationSubmission {
  if (!input || typeof input !== 'object') {
    throw new Error('submit: input is required');
  }
  if (!isSafeId(input.id, 64)) {
    throw new Error('submit: id must be [a-z0-9._-], 1..64 chars');
  }
  if (!isSafeActorId(input.submitterId)) {
    throw new Error('submit: submitterId must be 1..128 chars without control chars');
  }
  if (!isSafeId(input.modelId, 64)) {
    throw new Error('submit: modelId must be [a-z0-9._-], 1..64 chars');
  }
  if (submissions.has(input.id)) {
    throw new Error(`submit: id "${input.id}" already exists`);
  }

  const createdAt = resolveNow(options);
  const submission: ModerationSubmission = Object.freeze({
    id: input.id,
    submitterId: input.submitterId,
    modelId: input.modelId,
    status: 'pending',
    createdAt,
    reviewedAt: null,
    reviewerId: null,
    reason: null,
  });
  submissions.set(submission.id, submission);
  appendAudit({
    submissionId: submission.id,
    type: 'submission.received',
    actor: options.actor ?? input.submitterId,
    timestamp: createdAt,
    detail: { submitterId: input.submitterId, modelId: input.modelId },
  });
  options.onTelemetry?.({
    type: 'leaderboard.submission.received',
    submissionId: submission.id,
    modelId: submission.modelId,
  });
  return submission;
}

/**
 * Moderator review decision. Rejects if:
 *   - submission does not exist
 *   - submission is already in a terminal state (approved|rejected)
 *   - reviewerId is missing / unsafe
 *   - reviewerId equals submitterId (self-review interlock)
 *   - reject path: reason missing / empty / too long / control-char-only
 *
 * On success, returns the new frozen submission with `approved` or
 * `rejected` status and the reviewer/timestamp/reason populated.
 */
export function review(
  submissionId: string,
  reviewerId: string,
  decision: ReviewDecision,
  options: ModerationOptions = {},
): ModerationSubmission {
  if (!isSafeId(submissionId, 64)) {
    throw new Error('review: invalid submissionId');
  }
  if (!isSafeActorId(reviewerId)) {
    throw new Error('review: reviewerId must be 1..128 chars without control chars');
  }
  if (!decision || typeof decision !== 'object') {
    throw new Error('review: decision is required');
  }

  const current = submissions.get(submissionId);
  if (!current) {
    throw new Error(`review: submission "${submissionId}" not found`);
  }
  if (current.status !== 'pending') {
    throw new Error(
      `review: submission "${submissionId}" is ${current.status}; terminal-state transitions are not allowed`,
    );
  }
  if (current.submitterId === reviewerId) {
    throw new Error('review: moderator may not review own submission');
  }

  const reviewedAt = resolveNow(options);
  if (decision.decision === 'approve') {
    const next: ModerationSubmission = Object.freeze({
      ...current,
      status: 'approved',
      reviewedAt,
      reviewerId,
      reason: null,
    });
    submissions.set(submissionId, next);
    appendAudit({
      submissionId,
      type: 'submission.approved',
      actor: options.actor ?? reviewerId,
      timestamp: reviewedAt,
      detail: { reviewerId, modelId: current.modelId },
    });
    options.onTelemetry?.({
      type: 'leaderboard.submission.reviewed',
      submissionId,
      decision: 'approve',
    });
    return next;
  }

  if (decision.decision !== 'reject') {
    throw new Error('review: decision must be approve | reject');
  }

  const reason = sanitiseReason(decision.reason);
  const next: ModerationSubmission = Object.freeze({
    ...current,
    status: 'rejected',
    reviewedAt,
    reviewerId,
    reason,
  });
  submissions.set(submissionId, next);
  appendAudit({
    submissionId,
    type: 'submission.rejected',
    actor: options.actor ?? reviewerId,
    timestamp: reviewedAt,
    // NOTE: reason is stored on the audit record for compliance. It is
    // intentionally NOT forwarded to telemetry (R-T1: no payload in
    // telemetry).
    detail: { reviewerId, modelId: current.modelId, reason },
  });
  options.onTelemetry?.({
    type: 'leaderboard.submission.reviewed',
    submissionId,
    decision: 'reject',
  });
  return next;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getSubmission(id: string): ModerationSubmission | null {
  return submissions.get(id) ?? null;
}

/**
 * List submissions, optionally filtered by status. Sort: oldest first
 * (queue semantics) — the moderation UI shows the oldest pending
 * submission at the top.
 */
export function listSubmissions(filter?: {
  readonly status?: ModerationStatus;
}): readonly ModerationSubmission[] {
  const all = Array.from(submissions.values());
  const filtered = filter?.status ? all.filter((s) => s.status === filter.status) : all;
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

export function getModerationAuditLog(filter?: {
  readonly submissionId?: string;
}): readonly ModerationAuditEntry[] {
  if (!filter?.submissionId) return [...auditLog];
  return auditLog.filter((e) => e.submissionId === filter.submissionId);
}

/**
 * Reset in-memory moderation state. Intended for tests — never call
 * from production code paths.
 */
export function __resetModerationForTests(): void {
  submissions.clear();
  auditLog.length = 0;
}
