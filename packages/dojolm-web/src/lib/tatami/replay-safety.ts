// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/replay-safety — replay-safety classifier (OSS, Epic 6 / P2.1).
 *
 * Answers "may this proof be replayed, and if not, why?" *without executing a
 * replay* (MUST-8). Pure + deterministic: derives a {@link TatamiReplaySafety}
 * verdict plus a stable, de-duplicated list of {@link TatamiReplaySafetyReason}
 * codes from the structured signals a proof already carries. No I/O, no clock,
 * no provider call (live replay is the EE `tatami-vault` surface).
 *
 * The verdict is a function of three reason tiers:
 *   - BLOCKING   → `not_replayable` (no input to replay, evidence gone, only a
 *                  stub/fixture, a live side-effect, policy/provider bars it, or
 *                  the deterministic knobs a re-run needs are absent).
 *   - REDACTION  → at most `replayable_redacted` (PII/secret in the payload — a
 *                  replay is fine but only through redaction).
 *
 * Whether a replay may happen at all is ALL this classifier decides; the
 * reproducibility CLAIM (cached re-read vs deterministic re-execution) is a
 * separate decision made in replay.ts.
 *
 * `attack_technique` is deliberately NOT a redaction reason here: the operative
 * payload is stripped by the export redactor, not by refusing the replay.
 */

import type {
  TatamiMaturity,
  TatamiRedactionClass,
  TatamiReplaySafety,
  TatamiReplaySafetyReason,
  TatamiReproducibility,
} from './types';

/** Structured signals the classifier reasons over — never raw payload. */
export interface ReplaySafetyInput {
  /** The replayable input (prompt/seed text) is captured (e.g. `inputHash` set). */
  readonly hasPromptSnapshot: boolean;
  /** Maturity of the source proof — a `stub`/`fixture` has nothing real to replay. */
  readonly maturity: TatamiMaturity;
  /** Reproducibility axis (advisory context; does not gate safety on its own). */
  readonly reproducibility?: TatamiReproducibility;
  /** Redaction classes present across the proof's previews. */
  readonly redactionClasses?: readonly TatamiRedactionClass[];
  /** The source evidence has aged out of retention (B4) and can no longer be read. */
  readonly retentionExpired?: boolean;
  /** This is a model run whose deterministic knobs (seed/temp) matter for replay. */
  readonly requiresModelConfig?: boolean;
  /** A bounded model-config snapshot (seed/temp/…) is present. */
  readonly hasModelConfig?: boolean;
  /** Replaying would re-trigger a real side effect (live tool-call, mutation, …). */
  readonly liveSideEffectRisk?: boolean;
  /** An org/provider policy forbids replaying this evidence. */
  readonly policyRestricted?: boolean;
  /** Replay requires a live provider call (EE live replay only). */
  readonly providerRequired?: boolean;
  /** The required provider is reachable. Only consulted when `providerRequired`. */
  readonly providerAvailable?: boolean;
}

export interface ReplaySafetyVerdict {
  readonly safety: TatamiReplaySafety;
  readonly reasons: readonly TatamiReplaySafetyReason[];
}

/**
 * Reasons that make a replay impossible → `not_replayable`. `missing_seed` is a
 * member of {@link TatamiReplaySafetyReason} but has no input signal in this
 * classifier yet, so it is intentionally NOT listed here (a reason this code
 * cannot emit must not sit in a live blocking set).
 */
const BLOCKING_REASONS: ReadonlySet<TatamiReplaySafetyReason> = new Set([
  'missing_prompt_snapshot',
  'retention_expired',
  'stub_or_fixture_only',
  'live_side_effect_risk',
  'policy_restricted',
  'provider_unavailable',
  'missing_model_config',
]);

/** Reasons that cap the verdict at `replayable_redacted` (replay only via redaction). */
const REDACTION_REASONS: ReadonlySet<TatamiReplaySafetyReason> = new Set([
  'pii_present',
  'secret_present',
]);

/**
 * Stable emit order so two proofs with the same signals always classify
 * byte-identically (the reason list rides into receipts/deltas downstream).
 */
const REASON_ORDER: readonly TatamiReplaySafetyReason[] = [
  'stub_or_fixture_only',
  'missing_prompt_snapshot',
  'missing_model_config',
  'retention_expired',
  'provider_unavailable',
  'live_side_effect_risk',
  'policy_restricted',
  'pii_present',
  'secret_present',
];

function orderReasons(reasons: ReadonlySet<TatamiReplaySafetyReason>): TatamiReplaySafetyReason[] {
  return REASON_ORDER.filter((r) => reasons.has(r));
}

/**
 * Classify whether a proof may be replayed and collect the reason codes. Pure;
 * the same input always yields the same verdict and the same ordered reasons.
 */
export function classifyReplaySafety(input: ReplaySafetyInput): ReplaySafetyVerdict {
  const reasons = new Set<TatamiReplaySafetyReason>();

  if (input.maturity === 'stub' || input.maturity === 'fixture') {
    reasons.add('stub_or_fixture_only');
  }
  if (!input.hasPromptSnapshot) reasons.add('missing_prompt_snapshot');
  if (input.retentionExpired) reasons.add('retention_expired');
  if (input.liveSideEffectRisk) reasons.add('live_side_effect_risk');
  if (input.policyRestricted) reasons.add('policy_restricted');
  if (input.requiresModelConfig && !input.hasModelConfig) reasons.add('missing_model_config');
  // Fail safe: when a provider is required, anything other than a confirmed-true
  // availability (including an omitted/`undefined` signal) blocks the replay —
  // unconfirmed reachability must never read as `replayable`.
  if (input.providerRequired && input.providerAvailable !== true) {
    reasons.add('provider_unavailable');
  }

  const classes = input.redactionClasses ?? [];
  if (classes.includes('pii')) reasons.add('pii_present');
  if (classes.includes('secret')) reasons.add('secret_present');

  let safety: TatamiReplaySafety = 'replayable';
  const hasBlocking = [...reasons].some((r) => BLOCKING_REASONS.has(r));
  const hasRedaction = [...reasons].some((r) => REDACTION_REASONS.has(r));
  if (hasBlocking) safety = 'not_replayable';
  else if (hasRedaction) safety = 'replayable_redacted';

  return { safety, reasons: orderReasons(reasons) };
}
