// SPDX-License-Identifier: Apache-2.0
/**
 * G.3.1: Hattori-mode threshold rules — AIVSS-aware guard-mode escalation.
 *
 * Pure threshold evaluator. Given an `AivssRollup` (band counts) and a
 * set of `HattoriThresholdRule`s, returns the recommended target mode if
 * any rule fires (highest-precedence rule wins). Foundation-only —
 * producer wiring (auto-kill-switch trigger) lands in
 * TICKET-G3-KILL-SWITCH-TRIGGER follow-up.
 *
 * R-T1 closed-enum discipline — `aivssBand` constrained to AIVSS_BANDS,
 * `targetMode` constrained to HATTORI_TARGET_MODES (literal union mirror
 * of the platform-wide GuardMode in dojolm-web/lib/db/types.ts).
 *
 * @see ADR-0097 §11 — Phase G AIVSS cross-cuts
 */

import { AIVSS_BANDS, type AivssBand } from './aivss-spec';
import type { AivssRollup } from '../compliance/types.js';

/**
 * Closed-enum mirror of GuardMode in `packages/dojolm-web/src/lib/db/types.ts`.
 * Tuple order pins precedence — last-listed wins. The
 * `hattori-thresholds-target-modes` test pins this mirror against the
 * platform-wide GuardMode literals so a future drift fails loudly.
 */
export const HATTORI_TARGET_MODES = ['shinobi', 'samurai', 'sensei', 'hattori'] as const;
export type HattoriTargetMode = (typeof HATTORI_TARGET_MODES)[number];

/**
 * Rule: when at least `minCount` findings of the given `aivssBand` are
 * present in the rollup, escalate to `targetMode`. Highest-precedence
 * mode wins when multiple rules fire (precedence ordering pinned to the
 * HATTORI_TARGET_MODES tuple — last-listed wins, so 'hattori' beats
 * 'sensei' beats 'samurai' beats 'shinobi').
 *
 * `minCount` must be a positive integer; `aivssBand` must be a member
 * of AIVSS_BANDS; `targetMode` must be a member of HATTORI_TARGET_MODES.
 */
export interface HattoriThresholdRule {
  readonly aivssBand: AivssBand;
  readonly minCount: number;
  readonly targetMode: HattoriTargetMode;
}

/**
 * Default threshold rule set per ADR-0097 §11. Operators may override
 * via admin_settings.hattori_thresholds (admin UI lands in a follow-up
 * PR). The rules are deliberately conservative — operators tune them
 * up (more aggressive escalation) or down (less aggressive) per their
 * environment.
 */
export const DEFAULT_HATTORI_THRESHOLDS: readonly HattoriThresholdRule[] = Object.freeze([
  Object.freeze({ aivssBand: 'critical', minCount: 5, targetMode: 'hattori' }),
  Object.freeze({ aivssBand: 'critical', minCount: 1, targetMode: 'sensei' }),
  Object.freeze({ aivssBand: 'high', minCount: 10, targetMode: 'sensei' }),
  Object.freeze({ aivssBand: 'high', minCount: 3, targetMode: 'samurai' }),
] satisfies readonly HattoriThresholdRule[]);

/**
 * Pure rule validator. Returns false if the rule shape is malformed
 * (negative minCount, unknown band, unknown target mode, etc).
 *
 * Intended for callers persisting operator-supplied threshold overrides
 * — admin UI runs each candidate rule through this gate before writing
 * to admin_settings.hattori_thresholds. The evaluator
 * {@link evaluateHattoriThresholds} is also defensive and silently
 * skips malformed rules so a single bad row in persistence cannot
 * crash an evaluation.
 */
export function isValidThresholdRule(raw: unknown): raw is HattoriThresholdRule {
  if (raw === null || typeof raw !== 'object') return false;
  const r = raw as Partial<HattoriThresholdRule>;
  if (typeof r.minCount !== 'number' || !Number.isFinite(r.minCount) || r.minCount < 1) {
    return false;
  }
  if (!Number.isInteger(r.minCount)) return false;
  if (
    typeof r.aivssBand !== 'string' ||
    !(AIVSS_BANDS as readonly string[]).includes(r.aivssBand)
  ) {
    return false;
  }
  if (
    typeof r.targetMode !== 'string' ||
    !(HATTORI_TARGET_MODES as readonly string[]).includes(r.targetMode)
  ) {
    return false;
  }
  return true;
}

/**
 * Evaluate threshold rules against a rollup. Returns the
 * highest-precedence target mode whose rule fires (precedence pinned
 * by HATTORI_TARGET_MODES order — 'hattori' wins over 'sensei' wins
 * over 'samurai' wins over 'shinobi'). Returns null when no rule fires.
 *
 * Non-firing rules and malformed rules are silently skipped (caller is
 * responsible for validating inputs via {@link isValidThresholdRule}
 * before persisting; this evaluator is defensive).
 *
 * Immutable evaluation via `reduce` — no `let` mutation per project
 * R-T1 discipline.
 */
export function evaluateHattoriThresholds(
  rollup: AivssRollup,
  rules: readonly HattoriThresholdRule[],
): HattoriTargetMode | null {
  return rules.reduce<HattoriTargetMode | null>((best, rule) => {
    if (!isValidThresholdRule(rule)) return best;
    // Defensive `?? 0`: if a future band is added to AIVSS_BANDS before
    // aggregateAivssRollup initialises it, the lookup yields undefined
    // — coerce to 0 so the rule explicitly does not fire (rather than
    // relying on `undefined < n === false`).
    const count = rollup.byBand[rule.aivssBand] ?? 0;
    if (count < rule.minCount) return best;
    const candidatePrec = HATTORI_TARGET_MODES.indexOf(rule.targetMode);
    const bestPrec = best === null ? -1 : HATTORI_TARGET_MODES.indexOf(best);
    return candidatePrec > bestPrec ? rule.targetMode : best;
  }, null);
}
