// SPDX-License-Identifier: Apache-2.0
/**
 * AIVSS Specification — closed-enum vocabulary + weight tables + severity bands.
 *
 * Phase G.1 / TICKET-G1 — V1→V2 Restoration program.
 *
 * Source-of-truth: ADR-0097 (operator-approved 2026-05-04).
 * Severity-band keys: full-word (`'medium'`/`'critical'`) per CA-1 resolution.
 * CSS class shorteners (`av-band-med`/`av-band-crit`) accessible only via {@link BAND_CSS_KEY}.
 *
 * This module is the type + constant source. The calculator math lives in
 * `./aivss-calculator.ts`; vector-string serialization lives in `./aivss-vector.ts`.
 *
 * @see ADR-0097 §1 — 11-metric closed-enum spec
 * @see ADR-0097 §2 — Closed-enum severity bands
 * @see ADR-0097 §3 — Scoring formula (canonical math)
 * @see ADR-0097 §4 — `AivssScore` shape
 * @see ADR-0097 §5 — Library shape
 * @see canvas-amendments-2026-Q2.md CA-1 — full-word band keys
 */

// ───────────────────────────────────────────────────────────────────────────────
// §2 — Severity bands (full-word keys per CA-1)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Severity bands derived from final AIVSS score.
 *
 * Full-word keys per CA-1 resolution; CSS class shorteners only via {@link BAND_CSS_KEY}.
 *
 * @see ADR-0097 §2
 */
export const AIVSS_BANDS = ['none', 'low', 'medium', 'high', 'critical'] as const;
export type AivssBand = (typeof AIVSS_BANDS)[number];

/**
 * Inclusive numeric thresholds for each band, against the final environmental
 * score (or base score if env metrics absent).
 *
 * @see ADR-0097 §2
 */
export const BAND_THRESHOLDS: Readonly<Record<AivssBand, { min: number; max: number }>> = {
  none: { min: 0.0, max: 0.0 },
  low: { min: 0.1, max: 3.9 },
  medium: { min: 4.0, max: 6.9 },
  high: { min: 7.0, max: 8.9 },
  critical: { min: 9.0, max: 10.0 },
};

/**
 * CSS class shorteners — `medium → 'av-band-med'`, `critical → 'av-band-crit'` per CA-1.
 *
 * Engineering NEVER uses `'med'` / `'crit'` as primary band keys in TS code; only at the
 * CSS boundary, derived through this closed map.
 *
 * @see canvas-amendments-2026-Q2.md CA-1
 */
export const BAND_CSS_KEY: Readonly<Record<AivssBand, string>> = {
  none: 'av-band-none',
  low: 'av-band-low',
  medium: 'av-band-med',
  high: 'av-band-high',
  critical: 'av-band-crit',
};

// ───────────────────────────────────────────────────────────────────────────────
// §1 — 11 metric enums (Base 8 + Temporal 1 + Environmental 2)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Attack Vector — CVSS-aligned.
 *
 * @see ADR-0097 §1 metric 1
 */
export const AIVSS_ATTACK_VECTORS = ['network', 'adjacent', 'local', 'physical'] as const;
export type AivssAttackVector = (typeof AIVSS_ATTACK_VECTORS)[number];

/**
 * Attack Complexity — CVSS-aligned.
 *
 * @see ADR-0097 §1 metric 2
 */
export const AIVSS_ATTACK_COMPLEXITIES = ['low', 'high'] as const;
export type AivssAttackComplexity = (typeof AIVSS_ATTACK_COMPLEXITIES)[number];

/**
 * Prompt Injection Success Rate — AI-specific.
 *
 * - `low`  — <10% attempts succeed
 * - `medium` — 10–50%
 * - `high` — >50%
 *
 * @see ADR-0097 §1 metric 3
 */
export const AIVSS_PIS_RATES = ['low', 'medium', 'high'] as const;
export type AivssPis = (typeof AIVSS_PIS_RATES)[number];

/**
 * Model Criticality — AI-specific.
 *
 * - `tier-1` — production user-facing
 * - `tier-2` — internal-facing
 * - `tier-3` — sandbox / dev
 *
 * @see ADR-0097 §1 metric 4
 */
export const AIVSS_MC_TIERS = ['tier-1', 'tier-2', 'tier-3'] as const;
export type AivssMc = (typeof AIVSS_MC_TIERS)[number];

/**
 * Data Sensitivity — `regulated` covers PII / PHI / financial.
 *
 * @see ADR-0097 §1 metric 5
 */
export const AIVSS_DS_LEVELS = ['none', 'public', 'internal', 'confidential', 'regulated'] as const;
export type AivssDs = (typeof AIVSS_DS_LEVELS)[number];

/**
 * Impact dimensions — used for Confidentiality / Integrity / Availability impact.
 *
 * Renamed in code from canonical "AI" → `availabilityImpact` to disambiguate from "AI"
 * the domain.
 *
 * @see ADR-0097 §1 metrics 6–8
 */
export const AIVSS_IMPACT_LEVELS = ['none', 'low', 'high'] as const;
export type AivssImpact = (typeof AIVSS_IMPACT_LEVELS)[number];

/**
 * Exploitability — Temporal metric, CVSS-aligned.
 *
 * @see ADR-0097 §1 metric 9
 */
export const AIVSS_EXPLOITABILITIES = [
  'theoretical',
  'proof-of-concept',
  'functional',
  'high',
] as const;
export type AivssExploitability = (typeof AIVSS_EXPLOITABILITIES)[number];

/**
 * Scope — Environmental metric, CVSS-aligned.
 *
 * @see ADR-0097 §1 metric 10
 */
export const AIVSS_SCOPES = ['unchanged', 'changed'] as const;
export type AivssScope = (typeof AIVSS_SCOPES)[number];

/**
 * Remediation Level — Environmental metric, CVSS-aligned.
 *
 * @see ADR-0097 §1 metric 11
 */
export const AIVSS_REMEDIATION_LEVELS = [
  'official-fix',
  'temporary',
  'workaround',
  'unavailable',
] as const;
export type AivssRl = (typeof AIVSS_REMEDIATION_LEVELS)[number];

// ───────────────────────────────────────────────────────────────────────────────
// §3 — Weight tables (operator-blessed at draft defaults — see ADR-0097)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Attack Vector weights — `network: 0.85, adjacent: 0.62, local: 0.55, physical: 0.20`.
 *
 * Operator pre-blessed at "draft defaults, tunable via Phase G.1 PR amendment if calibration
 * drift surfaces post-deploy".
 *
 * @see ADR-0097 §3
 */
export const AV_WEIGHTS: Readonly<Record<AivssAttackVector, number>> = {
  network: 0.85,
  adjacent: 0.62,
  local: 0.55,
  physical: 0.2,
};

/**
 * Attack Complexity weights — `low: 0.77, high: 0.44`.
 *
 * @see ADR-0097 §3
 */
export const AC_WEIGHTS: Readonly<Record<AivssAttackComplexity, number>> = {
  low: 0.77,
  high: 0.44,
};

/**
 * Prompt Injection Success weights — `low: 0.20, medium: 0.55, high: 0.85`.
 *
 * @see ADR-0097 §3
 */
export const PIS_WEIGHTS: Readonly<Record<AivssPis, number>> = {
  low: 0.2,
  medium: 0.55,
  high: 0.85,
};

/**
 * Model Criticality weights — `tier-1: 0.85, tier-2: 0.55, tier-3: 0.30`.
 *
 * @see ADR-0097 §3
 */
export const MC_WEIGHTS: Readonly<Record<AivssMc, number>> = {
  'tier-1': 0.85,
  'tier-2': 0.55,
  'tier-3': 0.3,
};

/**
 * Data Sensitivity weights — `none: 0.0, public: 0.20, internal: 0.40, confidential: 0.62, regulated: 0.85`.
 *
 * @see ADR-0097 §3
 */
export const DS_WEIGHTS: Readonly<Record<AivssDs, number>> = {
  none: 0.0,
  public: 0.2,
  internal: 0.4,
  confidential: 0.62,
  regulated: 0.85,
};

/**
 * Impact weights — applied to all three of Confidentiality / Integrity / Availability impact.
 *
 * - `none: 0.0, low: 0.22, high: 0.56`.
 *
 * @see ADR-0097 §3
 */
export const IMPACT_WEIGHTS: Readonly<Record<AivssImpact, number>> = {
  none: 0.0,
  low: 0.22,
  high: 0.56,
};

/**
 * Temporal Exploitability weights — multiplicative against base.
 *
 * @see ADR-0097 §3
 */
export const E_WEIGHTS: Readonly<Record<AivssExploitability, number>> = {
  theoretical: 0.85,
  'proof-of-concept': 0.91,
  functional: 0.95,
  high: 1.0,
};

/**
 * Environmental Scope weights — multiplicative against temporal.
 *
 * @see ADR-0097 §3
 */
export const S_WEIGHTS: Readonly<Record<AivssScope, number>> = {
  unchanged: 1.0,
  changed: 1.08,
};

/**
 * Environmental Remediation Level weights — multiplicative against temporal × scope.
 *
 * @see ADR-0097 §3
 */
export const RL_WEIGHTS: Readonly<Record<AivssRl, number>> = {
  'official-fix': 0.95,
  temporary: 0.96,
  workaround: 0.97,
  unavailable: 1.0,
};

// ───────────────────────────────────────────────────────────────────────────────
// §4 — `AivssMetrics` + `AivssScore` shapes
// ───────────────────────────────────────────────────────────────────────────────

/**
 * 11 metrics — 8 base (required) + 3 optional (1 temporal + 2 environmental).
 *
 * @see ADR-0097 §4
 */
export interface AivssMetrics {
  readonly attackVector: AivssAttackVector;
  readonly attackComplexity: AivssAttackComplexity;
  readonly promptInjectionSuccess: AivssPis;
  readonly modelCriticality: AivssMc;
  readonly dataSensitivity: AivssDs;
  readonly confidentialityImpact: AivssImpact;
  readonly integrityImpact: AivssImpact;
  readonly availabilityImpact: AivssImpact;
  readonly exploitability?: AivssExploitability;
  readonly scope?: AivssScope;
  readonly remediationLevel?: AivssRl;
}

/**
 * Output of {@link calculate} — base (always) + temporal/environmental (when metrics
 * provided) + derived severity + serialized vector string.
 *
 * @see ADR-0097 §4
 */
export interface AivssScore {
  readonly base: number;
  readonly temporal: number | null;
  readonly environmental: number | null;
  readonly severity: AivssBand;
  readonly vector: string;
}
