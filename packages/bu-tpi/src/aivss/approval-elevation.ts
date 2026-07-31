// SPDX-License-Identifier: Apache-2.0
/**
 * G.3.2: Approval-elevation policy — AIVSS-aware sign-off rule.
 *
 * Pure decision function. Given the count of CRITICAL-band findings a
 * requester has touched within a lookback window, returns whether the
 * sign-off requires elevated approval (additional approver beyond the
 * normal single-reviewer flow).
 *
 * Foundation-only — producer wiring (BushidoSignoffPanel discriminator
 * + DSR-touch query + admin_settings overrides) lands in
 * TICKET-G3-APPROVAL-ELEVATION-CONSUMER follow-up.
 *
 * Reference: master checklist §11.2 G.3.2 — "Approval elevation by
 * AIVSS (CRITICAL touch in last 90 days)" — discriminator on
 * <BushidoSignoffPanel>.
 *
 * R-T1 closed-enum discipline — policy keys constrained to
 * APPROVAL_ELEVATION_REASONS (literal union); thresholds frozen.
 */

/**
 * Reason a sign-off was elevated. Closed-enum so consumers (UI banner,
 * audit log) can render via a closed map without `default:` fall-through.
 */
export const APPROVAL_ELEVATION_REASONS = Object.freeze([
  'critical-aivss-recent-touch',
] as const);
export type ApprovalElevationReason = (typeof APPROVAL_ELEVATION_REASONS)[number];

/**
 * Decision shape returned by `decideApprovalElevation`. Frozen.
 */
export interface ApprovalElevationDecision {
  /** Whether the sign-off requires elevated approval. */
  readonly elevated: boolean;
  /** When elevated === true: the reason code. Null otherwise. */
  readonly reason: ApprovalElevationReason | null;
  /** Echo of the threshold + observed count for audit-log clarity. */
  readonly observedCriticalCount: number;
  /** Echo of the policy threshold the decision used. */
  readonly thresholdCriticalCount: number;
  /** Echo of the lookback window in days. */
  readonly lookbackDays: number;
}

/**
 * Policy input.
 *   - `criticalTouchCount`: how many CRITICAL-band findings the requester
 *     has touched within `lookbackDays`. Caller computes via the producer
 *     query (TICKET-G3-APPROVAL-ELEVATION-CONSUMER).
 *   - `policy`: the active policy (default vs admin-overridden).
 */
export interface ApprovalElevationPolicy {
  /** Required count to trigger elevation. Positive integer >= 1. */
  readonly thresholdCriticalCount: number;
  /** Lookback window. Positive integer >= 1. */
  readonly lookbackDays: number;
}

/**
 * Default policy per ADR-0097 §11 / master checklist §11.2 G.3.2.
 * One CRITICAL touch in the last 90 days triggers elevated approval.
 * Operators tune via admin_settings.approval_elevation_policy
 * (admin UI lands in a follow-up PR).
 */
export const DEFAULT_APPROVAL_ELEVATION_POLICY: ApprovalElevationPolicy = Object.freeze({
  thresholdCriticalCount: 1,
  lookbackDays: 90,
} satisfies ApprovalElevationPolicy);

/**
 * Pure policy validator. Returns true iff the policy shape is well-
 * formed (positive integer threshold + lookback). Use to validate
 * admin-supplied overrides before persisting.
 */
export function isValidApprovalElevationPolicy(
  raw: unknown,
): raw is ApprovalElevationPolicy {
  if (raw === null || typeof raw !== 'object') return false;
  const r = raw as Partial<ApprovalElevationPolicy>;
  if (
    typeof r.thresholdCriticalCount !== 'number' ||
    !Number.isInteger(r.thresholdCriticalCount) ||
    r.thresholdCriticalCount < 1
  ) {
    return false;
  }
  if (
    typeof r.lookbackDays !== 'number' ||
    !Number.isInteger(r.lookbackDays) ||
    r.lookbackDays < 1
  ) {
    return false;
  }
  return true;
}

/**
 * Decide whether a sign-off is elevated. Pure function — no I/O, no
 * side effects. The returned decision is fully frozen.
 */
export function decideApprovalElevation(args: {
  readonly criticalTouchCount: number;
  readonly policy?: ApprovalElevationPolicy;
}): ApprovalElevationDecision {
  const policy = args.policy ?? DEFAULT_APPROVAL_ELEVATION_POLICY;
  const observed =
    Number.isInteger(args.criticalTouchCount) && args.criticalTouchCount >= 0
      ? args.criticalTouchCount
      : 0;
  const elevated = observed >= policy.thresholdCriticalCount;
  return Object.freeze({
    elevated,
    reason: elevated ? APPROVAL_ELEVATION_REASONS[0] : null,
    observedCriticalCount: observed,
    thresholdCriticalCount: policy.thresholdCriticalCount,
    lookbackDays: policy.lookbackDays,
  });
}
