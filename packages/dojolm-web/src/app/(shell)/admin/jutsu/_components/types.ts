// SPDX-License-Identifier: Apache-2.0
/**
 * Shared Jutsu Models surface types + closed-enum maps.
 *
 * Extracted from `JutsuClient.tsx` per the >800 LOC split (PR #3 of the
 * Phase 2 polish wave). Each `_components/*` consumer (ModelCard,
 * ModelDetailDrawer, etc.) imports its narrow tone/score record from
 * here; the orchestrator (`JutsuClient.tsx`) re-exports them via
 * namespace import for back-compat with the prior single-file layout.
 *
 * Narrow direct-component-path imports only (per
 * the darwin-perf import rule) — types module pulls
 * from `@/design/primitives/SevStrip` not the bare `@/design` barrel.
 */

import type { SevStripLevel } from '@/design/primitives/SevStrip';
import type { AivssScore } from 'bu-tpi/aivss';

/** Closed 5-value safety-risk enum. UPPERCASE convention (mirrors V1). */
export type SafetyRisk = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';

/** Narrowed safe shape returned by `sanitizeModel`. */
export interface SafeModelConfig {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly model: string;
  readonly enabled: boolean;
  readonly safetyRisk?: SafetyRisk;
  readonly requiresGuard?: boolean;
  readonly maxTokens?: number;
  readonly temperature?: number;
  /** ISO last-updated stamp — drives the card's `UPDATED` meta cell
   *  (design wave-g3 `.mdl-meta`). Absent → the cell renders an em-dash. */
  readonly updatedAt?: string;
  readonly aivss?: AivssScore;
}

export const SAFETY_TO_SEV_LEVEL: Record<SafetyRisk, SevStripLevel> = {
  CRITICAL: 'crit',
  HIGH: 'high',
  MEDIUM: 'med',
  LOW: 'low',
  SAFE: 'low',
};

export const SAFETY_LABEL: Record<SafetyRisk, string> = {
  CRITICAL: 'critical risk',
  HIGH: 'high risk',
  MEDIUM: 'medium risk',
  LOW: 'low risk',
  SAFE: 'safe',
};

/**
 * E1-A-RB-15.5 (Master Plan v1.0 §4.1): the enum→belt-score map retired.
 *
 * The prior implementation mapped an operator-set 5-value enum directly
 * to a 0-95 "resilience" belt score, displayed via `<BeltBadge>`. Pass-1
 * subagent #4 flagged this as the procurement-killer pattern — same
 * shape as the Bushido leaderboard demo fixture
 * theatre Marcus + Hélène diagnosed: a score that LOOKS like measurement
 * but derives from operator self-attestation alone.
 *
 * The constant is removed (not re-labeled). Consumers in
 * `JutsuClient.tsx` render the `<BeltBadge>` only when a real
 * measurement signal (`aivss`) is present on the model; otherwise the
 * card renders a "(not assessed)" placeholder. When E1-PHASE-4-M4
 * verdict-to-run binding lands, real measurement will flow through the
 * Kokugikan submission pipe (Phase-3-A backbone) and the BeltBadge
 * will display measurement-derived scores.
 *
 * Closes RB-15.5 of the 45-60d Bushido re-baseline (founder fire this
 * session reversing master plan §8 exclusion: github-public going live
 * IS the motivated reason for cleanup).
 */

/**
 * Closed `.chip` tone vocab — jade / red / gold / steel match the
 * primitives.css definitions. `JutsuChipTone` is the closed type for
 * tone props on the card so a runtime widening can't slip an
 * undefined-class chip past the type check.
 */
export type JutsuChipTone = 'jade' | 'red' | 'gold' | 'steel';

export const SAFETY_RISK_CHIP_TONE: Record<SafetyRisk, JutsuChipTone> = {
  CRITICAL: 'red',
  HIGH: 'red',
  MEDIUM: 'gold',
  LOW: 'jade',
  SAFE: 'jade',
};

/**
 * Closed severity → §1.4 risk-ramp `.rchip` class (design wave-g3 card
 * `.rchip crit|high|med|low|clean`). The card's risk chip is the bordered
 * ramp-word pill from the reference, distinct from the solid `.chip` status
 * pills — so it carries its own ramp vocab, not the `.chip` tone set.
 */
export type JutsuRiskRamp = 'crit' | 'high' | 'med' | 'low' | 'clean';

export const SAFETY_RISK_RAMP: Record<SafetyRisk, JutsuRiskRamp> = {
  CRITICAL: 'crit',
  HIGH: 'high',
  MEDIUM: 'med',
  LOW: 'low',
  SAFE: 'clean',
};

/**
 * CSS-variable accent for the model card's left-edge stripe — uses the
 * highest-priority tone among {enabled status, safetyRisk}.
 */
export function jutsuAccentVar(enabled: boolean, risk: SafetyRisk | undefined): string {
  if (!enabled) return 'var(--steel)';
  if (risk === 'CRITICAL' || risk === 'HIGH') return 'var(--torii-lg)';
  if (risk === 'MEDIUM') return 'var(--gold)';
  return 'var(--jade)';
}

export const NAME_MAX = 120;
export const MODEL_ID_MAX = 200;
export const PROVIDER_MAX = 64;
