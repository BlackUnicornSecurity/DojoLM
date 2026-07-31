// SPDX-License-Identifier: Apache-2.0
/**
 * AIVSS Vector — CVSS-style serialization + parsing.
 *
 * Phase G.1 / TICKET-G1 — V1→V2 Restoration program.
 *
 * Vector format: `AIVSS:1.0/AV:N/AC:L/PIS:H/MC:T1/DS:R/CI:H/II:L/AI:N[/E:F][/S:U][/RL:O]`
 *
 * - Required: `AV`, `AC`, `PIS`, `MC`, `DS`, `CI`, `II`, `AI` (8 base metrics).
 * - Optional: `E` (temporal), `S`, `RL` (environmental).
 * - Order is canonical when serializing; parser tolerates any order.
 *
 * @see ADR-0097 §5 — Vector contract
 */

import {
  AIVSS_ATTACK_COMPLEXITIES,
  AIVSS_ATTACK_VECTORS,
  AIVSS_DS_LEVELS,
  AIVSS_EXPLOITABILITIES,
  AIVSS_IMPACT_LEVELS,
  AIVSS_MC_TIERS,
  AIVSS_PIS_RATES,
  AIVSS_REMEDIATION_LEVELS,
  AIVSS_SCOPES,
  type AivssAttackComplexity,
  type AivssAttackVector,
  type AivssDs,
  type AivssExploitability,
  type AivssImpact,
  type AivssMc,
  type AivssMetrics,
  type AivssPis,
  type AivssRl,
  type AivssScope,
} from './aivss-spec';

// ───────────────────────────────────────────────────────────────────────────────
// Vector prefix
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Vector prefix — AIVSS spec version 1.0.
 *
 * Future spec rev (e.g. 2.0) requires a new prefix and parser branch.
 */
export const VECTOR_PREFIX = 'AIVSS:1.0' as const;

// ───────────────────────────────────────────────────────────────────────────────
// Forward maps (enum value → short code) — closed Records, R-T1
// ───────────────────────────────────────────────────────────────────────────────

const AV_CODE: Readonly<Record<AivssAttackVector, string>> = {
  network: 'N',
  adjacent: 'A',
  local: 'L',
  physical: 'P',
};

const AC_CODE: Readonly<Record<AivssAttackComplexity, string>> = {
  low: 'L',
  high: 'H',
};

const PIS_CODE: Readonly<Record<AivssPis, string>> = {
  low: 'L',
  medium: 'M',
  high: 'H',
};

const MC_CODE: Readonly<Record<AivssMc, string>> = {
  'tier-1': 'T1',
  'tier-2': 'T2',
  'tier-3': 'T3',
};

const DS_CODE: Readonly<Record<AivssDs, string>> = {
  none: 'N',
  public: 'P',
  internal: 'I',
  confidential: 'C',
  regulated: 'R',
};

const IMPACT_CODE: Readonly<Record<AivssImpact, string>> = {
  none: 'N',
  low: 'L',
  high: 'H',
};

const E_CODE: Readonly<Record<AivssExploitability, string>> = {
  theoretical: 'T',
  'proof-of-concept': 'P',
  functional: 'F',
  high: 'H',
};

const S_CODE: Readonly<Record<AivssScope, string>> = {
  unchanged: 'U',
  changed: 'C',
};

const RL_CODE: Readonly<Record<AivssRl, string>> = {
  'official-fix': 'O',
  temporary: 'T',
  workaround: 'W',
  unavailable: 'U',
};

// ───────────────────────────────────────────────────────────────────────────────
// Reverse maps (short code → enum value) — built once via closed-list iteration
// ───────────────────────────────────────────────────────────────────────────────

function buildReverse<T extends string>(
  values: readonly T[],
  forward: Readonly<Record<T, string>>,
): Readonly<Record<string, T>> {
  const out: Record<string, T> = {};
  for (const v of values) {
    out[forward[v]] = v;
  }
  return out;
}

const AV_FROM_CODE = buildReverse(AIVSS_ATTACK_VECTORS, AV_CODE);
const AC_FROM_CODE = buildReverse(AIVSS_ATTACK_COMPLEXITIES, AC_CODE);
const PIS_FROM_CODE = buildReverse(AIVSS_PIS_RATES, PIS_CODE);
const MC_FROM_CODE = buildReverse(AIVSS_MC_TIERS, MC_CODE);
const DS_FROM_CODE = buildReverse(AIVSS_DS_LEVELS, DS_CODE);
const IMPACT_FROM_CODE = buildReverse(AIVSS_IMPACT_LEVELS, IMPACT_CODE);
const E_FROM_CODE = buildReverse(AIVSS_EXPLOITABILITIES, E_CODE);
const S_FROM_CODE = buildReverse(AIVSS_SCOPES, S_CODE);
const RL_FROM_CODE = buildReverse(AIVSS_REMEDIATION_LEVELS, RL_CODE);

// ───────────────────────────────────────────────────────────────────────────────
// Serialize
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Serialize {@link AivssMetrics} → canonical vector string.
 *
 * Required base metrics always emitted in order: `AV`, `AC`, `PIS`, `MC`, `DS`, `CI`, `II`, `AI`.
 * Optional metrics appended in order: `E`, `S`, `RL` (each only if defined).
 *
 * @example
 * serializeVector({ attackVector: 'network', ... })
 * // → 'AIVSS:1.0/AV:N/AC:L/PIS:H/MC:T1/DS:R/CI:H/II:L/AI:N'
 */
export function serializeVector(metrics: AivssMetrics): string {
  const parts: string[] = [
    VECTOR_PREFIX,
    `AV:${AV_CODE[metrics.attackVector]}`,
    `AC:${AC_CODE[metrics.attackComplexity]}`,
    `PIS:${PIS_CODE[metrics.promptInjectionSuccess]}`,
    `MC:${MC_CODE[metrics.modelCriticality]}`,
    `DS:${DS_CODE[metrics.dataSensitivity]}`,
    `CI:${IMPACT_CODE[metrics.confidentialityImpact]}`,
    `II:${IMPACT_CODE[metrics.integrityImpact]}`,
    `AI:${IMPACT_CODE[metrics.availabilityImpact]}`,
  ];

  if (metrics.exploitability !== undefined) {
    parts.push(`E:${E_CODE[metrics.exploitability]}`);
  }
  if (metrics.scope !== undefined) {
    parts.push(`S:${S_CODE[metrics.scope]}`);
  }
  if (metrics.remediationLevel !== undefined) {
    parts.push(`RL:${RL_CODE[metrics.remediationLevel]}`);
  }

  return parts.join('/');
}

// ───────────────────────────────────────────────────────────────────────────────
// Parse
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Closed set of recognized metric keys — anything outside this set rejects the parse.
 */
const KNOWN_METRIC_KEYS = ['AV', 'AC', 'PIS', 'MC', 'DS', 'CI', 'II', 'AI', 'E', 'S', 'RL'] as const;
type KnownMetricKey = (typeof KNOWN_METRIC_KEYS)[number];

function isKnownKey(key: string): key is KnownMetricKey {
  return (KNOWN_METRIC_KEYS as readonly string[]).includes(key);
}

/**
 * Parse a vector string → {@link AivssMetrics}, or `null` on any malformedness.
 *
 * Rejects:
 * - Bad prefix (anything other than `AIVSS:1.0`)
 * - Unknown metric key (anything outside `KNOWN_METRIC_KEYS`)
 * - Unknown short-code value (e.g. `AV:Q`)
 * - Missing any required base metric (AV/AC/PIS/MC/DS/CI/II/AI)
 *
 * Optional metrics (E/S/RL) may be absent. Order-tolerant.
 *
 * @example
 * parseVector('AIVSS:1.0/AV:N/AC:L/PIS:H/MC:T1/DS:R/CI:H/II:L/AI:N')
 * // → { attackVector: 'network', attackComplexity: 'low', ... }
 */
export function parseVector(vector: string): AivssMetrics | null {
  const segments = vector.split('/');
  if (segments.length === 0) return null;

  // Prefix gate.
  if (segments[0] !== VECTOR_PREFIX) return null;

  // Per-metric scratch — left undefined until we see them.
  let attackVector: AivssAttackVector | undefined;
  let attackComplexity: AivssAttackComplexity | undefined;
  let promptInjectionSuccess: AivssPis | undefined;
  let modelCriticality: AivssMc | undefined;
  let dataSensitivity: AivssDs | undefined;
  let confidentialityImpact: AivssImpact | undefined;
  let integrityImpact: AivssImpact | undefined;
  let availabilityImpact: AivssImpact | undefined;
  let exploitability: AivssExploitability | undefined;
  let scope: AivssScope | undefined;
  let remediationLevel: AivssRl | undefined;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const colon = seg.indexOf(':');
    if (colon < 1 || colon === seg.length - 1) return null;
    const key = seg.slice(0, colon);
    const code = seg.slice(colon + 1);
    if (!isKnownKey(key)) return null;

    switch (key) {
      case 'AV': {
        const v = AV_FROM_CODE[code];
        if (!v) return null;
        attackVector = v;
        break;
      }
      case 'AC': {
        const v = AC_FROM_CODE[code];
        if (!v) return null;
        attackComplexity = v;
        break;
      }
      case 'PIS': {
        const v = PIS_FROM_CODE[code];
        if (!v) return null;
        promptInjectionSuccess = v;
        break;
      }
      case 'MC': {
        const v = MC_FROM_CODE[code];
        if (!v) return null;
        modelCriticality = v;
        break;
      }
      case 'DS': {
        const v = DS_FROM_CODE[code];
        if (!v) return null;
        dataSensitivity = v;
        break;
      }
      case 'CI': {
        const v = IMPACT_FROM_CODE[code];
        if (!v) return null;
        confidentialityImpact = v;
        break;
      }
      case 'II': {
        const v = IMPACT_FROM_CODE[code];
        if (!v) return null;
        integrityImpact = v;
        break;
      }
      case 'AI': {
        const v = IMPACT_FROM_CODE[code];
        if (!v) return null;
        availabilityImpact = v;
        break;
      }
      case 'E': {
        const v = E_FROM_CODE[code];
        if (!v) return null;
        exploitability = v;
        break;
      }
      case 'S': {
        const v = S_FROM_CODE[code];
        if (!v) return null;
        scope = v;
        break;
      }
      case 'RL': {
        const v = RL_FROM_CODE[code];
        if (!v) return null;
        remediationLevel = v;
        break;
      }
    }
  }

  // Required-metric completeness gate.
  if (
    attackVector === undefined ||
    attackComplexity === undefined ||
    promptInjectionSuccess === undefined ||
    modelCriticality === undefined ||
    dataSensitivity === undefined ||
    confidentialityImpact === undefined ||
    integrityImpact === undefined ||
    availabilityImpact === undefined
  ) {
    return null;
  }

  return {
    attackVector,
    attackComplexity,
    promptInjectionSuccess,
    modelCriticality,
    dataSensitivity,
    confidentialityImpact,
    integrityImpact,
    availabilityImpact,
    ...(exploitability !== undefined ? { exploitability } : {}),
    ...(scope !== undefined ? { scope } : {}),
    ...(remediationLevel !== undefined ? { remediationLevel } : {}),
  };
}
