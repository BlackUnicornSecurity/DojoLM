// SPDX-License-Identifier: Apache-2.0

/**
 * TatamiBadges — OSS (Apache-2.0) presentational evidence badges for the Tatami
 * Rail (Epic 3). Four status chips, one per real `TatamiProof` axis:
 *
 *   · MaturityBadge       — is this run live / synthetic / fixture / stub / replay
 *   · TrustBadge          — trust state (+ the integrity tier, in the tooltip)
 *   · ReplaySafetyBadge   — can this proof be safely re-run
 *   · ReproducibilityBadge— deterministic vs stochastic(-characterized/single)
 *
 * Each badge reads exactly ONE real enum field and maps it to a house chip tone
 * (`.chip.jade | steel | warn | red | ghost`) + a humanized label. It invents no
 * data and introduces no palette/font — every value is the canonical enum, every
 * colour an existing token. The map objects `satisfies Record<Enum, …>`, so a new
 * enum member fails the build until it is given an honest tone here.
 *
 * The aggregate {@link TatamiProofBadges} renders ONLY the fields actually
 * present on its input. Fed a full `TatamiProof` it shows all four; fed a bounded
 * `TatamiProofSummary` (which carries no `replaySafety` / `reproducibility`) it
 * shows just maturity + trust — it never fabricates the two badges it has no data
 * for. Honesty is the contract, not a nicety.
 *
 * Pure + hook-free (no `'use client'`, server-renderable). Imports only React +
 * type-only enums (erased at build → zero runtime weight, no `lib/tatami` value
 * pulled into the client bundle). Styling reuses the global `.chip` primitive;
 * only the compact dot variant adds the rail-local `.tr-badge--dot` rule
 * (`design/styles/patterns/tatami-rail.css`). OSS: imports no `tatami-vault` (EE).
 */

import type { ReactElement } from 'react';
import type {
  TatamiMaturity,
  TatamiReplaySafety,
  TatamiReproducibility,
  TatamiTrustState,
  TatamiTrustTier,
} from '@/lib/tatami/types';

/** The house chip tones a badge may use — every one a real `.chip.<tone>` token
 *  in primitives.css. Deliberately NO `green`: that class does not exist, so a
 *  positive state must map to `jade` (the `_lib` chip maps do — guarded by
 *  `tatami/__tests__/lib-chips.test.ts`). */
type BadgeTone = 'jade' | 'steel' | 'warn' | 'red' | 'ghost';

interface BadgeFace {
  readonly tone: BadgeTone;
  readonly label: string;
}

// ── Exhaustive enum → face maps (build fails if an enum member is unmapped) ──

const MATURITY_FACE = {
  live: { tone: 'jade', label: 'Live' },
  synthetic: { tone: 'warn', label: 'Synthetic' },
  fixture: { tone: 'ghost', label: 'Fixture' },
  stub: { tone: 'ghost', label: 'Stub' },
  replay: { tone: 'steel', label: 'Replay' },
} satisfies Record<TatamiMaturity, BadgeFace>;

const TRUST_STATE_FACE = {
  draft: { tone: 'ghost', label: 'Draft' },
  sealed: { tone: 'steel', label: 'Sealed' },
  verified: { tone: 'jade', label: 'Verified' },
  partially_verified: { tone: 'steel', label: 'Partial' },
  redacted: { tone: 'ghost', label: 'Redacted' },
  exported: { tone: 'steel', label: 'Exported' },
  challenged: { tone: 'red', label: 'Challenged' },
  superseded: { tone: 'ghost', label: 'Superseded' },
  broken_chain: { tone: 'red', label: 'Broken chain' },
} satisfies Record<TatamiTrustState, BadgeFace>;

/** Integrity tier shown as a tooltip qualifier on the trust badge. Raw words
 *  only — no "legal-grade" claim while the attested seal is not GA (plan O3). */
const TRUST_TIER_LABEL = {
  local: 'local',
  hashed: 'hashed',
  worm: 'WORM',
  signed: 'signed',
  attested: 'attested',
} satisfies Record<TatamiTrustTier, string>;

const REPLAY_SAFETY_FACE = {
  replayable: { tone: 'jade', label: 'Replayable' },
  replayable_redacted: { tone: 'steel', label: 'Replayable (redacted)' },
  not_replayable: { tone: 'ghost', label: 'Not replayable' },
} satisfies Record<TatamiReplaySafety, BadgeFace>;

const REPRODUCIBILITY_FACE = {
  deterministic: { tone: 'jade', label: 'Deterministic' },
  'stochastic-characterized': { tone: 'steel', label: 'Stochastic (characterized)' },
  'stochastic-single': { tone: 'warn', label: 'Stochastic (n=1)' },
  'non-reproducible': { tone: 'ghost', label: 'Non-reproducible' },
} satisfies Record<TatamiReproducibility, BadgeFace>;

// ── Shared chip renderer ─────────────────────────────────────────────────────

/**
 * One status chip. `compact` collapses it to a coloured dot only (for the 40px
 * collapsed spine): the visible text is dropped and the full name moves to
 * `aria-label` + `title`, so the meaning survives where the label cannot fit.
 * `detail` (the trust tier) appends to the accessible name / tooltip but is never
 * a separate visible element. Non-interactive by construction — a bare `<span>`,
 * no role, no tabindex.
 */
function Badge({
  tone,
  label,
  detail,
  compact,
  testId,
}: {
  tone: BadgeTone;
  label: string;
  detail?: string;
  compact?: boolean;
  testId: string;
}): ReactElement {
  const accessibleName = detail ? `${label} · ${detail}` : label;
  const className = compact ? `chip ${tone} tr-badge--dot` : `chip ${tone}`;
  // Expose the full accessible name (label + any detail) via aria-label + title
  // exactly when it carries more than the visible text: compact drops the text
  // entirely, and full mode with a `detail` (the trust tier) adds info the label
  // alone lacks — so an AT user hears "Verified · tier attested", not just the
  // sighted hover. When the visible label already IS the whole name, both stay
  // unset (no redundant announce, no tooltip echoing the text).
  const fullName = compact || detail ? accessibleName : undefined;
  return (
    <span className={className} data-testid={testId} aria-label={fullName} title={fullName}>
      <span className="dot" />
      {!compact && <span className="tr-badge__text">{label}</span>}
    </span>
  );
}

// ── Public per-axis badges ───────────────────────────────────────────────────

export function MaturityBadge({
  maturity,
  compact,
}: {
  maturity: TatamiMaturity;
  compact?: boolean;
}): ReactElement {
  const face = MATURITY_FACE[maturity];
  return <Badge tone={face.tone} label={face.label} compact={compact} testId="tatami-badge-maturity" />;
}

export function TrustBadge({
  state,
  tier,
  compact,
}: {
  state: TatamiTrustState;
  tier?: TatamiTrustTier;
  compact?: boolean;
}): ReactElement {
  const face = TRUST_STATE_FACE[state];
  const detail = tier ? `tier ${TRUST_TIER_LABEL[tier]}` : undefined;
  return (
    <Badge tone={face.tone} label={face.label} detail={detail} compact={compact} testId="tatami-badge-trust" />
  );
}

export function ReplaySafetyBadge({
  safety,
  compact,
}: {
  safety: TatamiReplaySafety;
  compact?: boolean;
}): ReactElement {
  const face = REPLAY_SAFETY_FACE[safety];
  return <Badge tone={face.tone} label={face.label} compact={compact} testId="tatami-badge-replay" />;
}

export function ReproducibilityBadge({
  value,
  compact,
}: {
  value: TatamiReproducibility;
  compact?: boolean;
}): ReactElement {
  const face = REPRODUCIBILITY_FACE[value];
  return <Badge tone={face.tone} label={face.label} compact={compact} testId="tatami-badge-repro" />;
}

// ── Aggregate ────────────────────────────────────────────────────────────────

/**
 * The subset of proof fields the badges read. All optional so the SAME aggregate
 * works for a full `TatamiProof` (all five present → four badges) and a bounded
 * `TatamiProofSummary` (maturity + trustState + trustTier only → two badges).
 */
export interface TatamiBadgeFields {
  readonly maturity?: TatamiMaturity;
  readonly trustState?: TatamiTrustState;
  readonly trustTier?: TatamiTrustTier;
  readonly replaySafety?: TatamiReplaySafety;
  readonly reproducibility?: TatamiReproducibility;
}

/**
 * The evidence badge cluster for a proof. Order: maturity · trust · replay-safety
 * · reproducibility. Renders a badge ONLY for a field that is present — it never
 * invents the `replaySafety` / `reproducibility` a summary projection omits.
 * Drop it into the Rail header `badges` slot (full) or the `spineBadges` slot
 * (`compact`).
 */
export function TatamiProofBadges({
  proof,
  compact,
}: {
  proof: TatamiBadgeFields;
  compact?: boolean;
}): ReactElement {
  return (
    <>
      {proof.maturity != null && <MaturityBadge maturity={proof.maturity} compact={compact} />}
      {proof.trustState != null && (
        <TrustBadge state={proof.trustState} tier={proof.trustTier} compact={compact} />
      )}
      {proof.replaySafety != null && <ReplaySafetyBadge safety={proof.replaySafety} compact={compact} />}
      {proof.reproducibility != null && (
        <ReproducibilityBadge value={proof.reproducibility} compact={compact} />
      )}
    </>
  );
}
