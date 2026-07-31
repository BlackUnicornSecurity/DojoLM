// SPDX-License-Identifier: Apache-2.0
/**
 * Mitsuke threat-indicator → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-MITSUKE — V1→V2 Restoration program.
 *
 * Pure function `findingToAivssMetrics(indicator) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-indicator
 * {@link AivssScore} for chip rendering on the Mitsuke Indicators table.
 *
 * Mitsuke "findings" surface = the Indicators tab list of {@link MitsukeFinding}.
 * Each row is a typed threat-intel indicator (IP / domain / hash / url / email
 * / pattern / ttp) carried over from the corpus loaded by the
 * `/api/mitsuke/indicators` route.
 *
 * Mapping strategy:
 *   - indicator.type (closed 7-value `IndicatorType` enum) is bucketed into
 *     the closed {@link AttackKind} taxonomy via {@link MITSUKE_TYPE_TO_KIND}.
 *     The mapping is exhaustive across every IndicatorType — `'unknown'` is
 *     reserved for the rare case where a future type slips past `IndicatorType`
 *     narrowing (defensive belt-and-braces, NOT a silent default).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors the
 *     scanner mapping for cross-domain consistency).
 *   - indicator.severity (closed 5-value `MitsukeSeverity` enum) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (CRITICAL/HIGH → high,
 *         MEDIUM → medium, LOW/INFO → low)
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (CRITICAL/HIGH → high, MEDIUM → low, LOW/INFO → none)
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Mitsuke indicators are by definition
 *     observed on network-reachable feeds — domain / IP / URL / email / hash
 *     all imply at least adjacency or network reach).
 *   - modelCriticality defaults to 'tier-1' (V2 admin/Mitsuke triage operates
 *     against production-incident posture; tier-2/3 tuning is a follow-up
 *     when per-indicator run-context plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Mitsuke surface;
 *     per-engagement override is a follow-up).
 *
 * Server-side AIVSS field on `/api/mitsuke/indicators` response is a separate
 * follow-up (TICKET-G3-API). This file is the CLIENT-SIDE derivation only,
 * mirroring the G-3-SCANNER pattern.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Mitsuke triage findings AIVSS field
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister module
 */

import type {
  AivssAttackComplexity,
  AivssAttackVector,
  AivssDs,
  AivssImpact,
  AivssMc,
  AivssMetrics,
  AivssPis,
} from 'bu-tpi/aivss';

import type {
  IndicatorType,
  MitsukeSeverity,
} from '@/app/(shell)/admin/mitsuke/MitsukeTabs';

/**
 * Local Finding shape used by the Mitsuke Indicators table. Mirrors the
 * narrowed subset of `ThreatIndicator` (from `MitsukeTabs.tsx`) that the
 * AIVSS mapping consumes — `type` + `severity` are sufficient inputs.
 *
 * Re-declared here (not imported as `Pick<ThreatIndicator, ...>`) to keep
 * this mapping module pure / unit-testable in isolation, mirroring the
 * `ScanFinding` declaration in `lib/scanner/aivss-mapping.ts`.
 */
export interface MitsukeFinding {
  readonly type: IndicatorType;
  readonly severity: MitsukeSeverity;
}

/**
 * Closed taxonomy of Mitsuke-attack kinds — bucketing layer between the
 * 7-value `IndicatorType` enum and the 2-state AivssAttackComplexity enum.
 *
 * Same {@link AttackKind} closed-enum shape as
 * `lib/scanner/aivss-mapping.ts` so cross-domain consumers can later share
 * a hoisted map (see GM-007 follow-up note in tests). Per-domain divergence
 * today: Mitsuke has no `'jailbreak'` or `'override'` kind because none of
 * the 7 IndicatorType values express those — but we keep the slots so the
 * downstream {@link KIND_TO_AC} map stays compatible with the scanner's.
 *
 * `'unknown'` is the EXPLICIT slot for a hypothetical future `IndicatorType`
 * value that lands without a row added here — NOT a silent default. Because
 * `IndicatorType` is a closed union today, every concrete value resolves to
 * a non-`'unknown'` kind; the slot is belt-and-braces against future enum
 * extension landing without a mapping update.
 */
export type AttackKind =
  | 'jailbreak'
  | 'encoding'
  | 'injection'
  | 'override'
  | 'social'
  | 'unknown';

/**
 * AttackKind → AivssAttackComplexity mapping (mirrors scanner version
 * verbatim — kept duplicated rather than hoisted because per-domain
 * divergence on the input side is large enough that a hoist would
 * couple the two domains' input enums).
 *
 * - `jailbreak` → `'high'` (typically requires multi-turn or staged setup)
 * - `encoding` / `injection` / `override` / `social` → `'low'` (single-shot)
 * - `unknown` → `'low'` (conservative — assume the easier case for an
 *   un-categorized finding so the AIVSS score does not understate severity).
 *
 * @see ADR-0097 §1 metric 2 — AC closed enum
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister table
 */
export const KIND_TO_AC: Readonly<Record<AttackKind, AivssAttackComplexity>> =
  Object.freeze({
    jailbreak: 'high',
    encoding: 'low',
    injection: 'low',
    override: 'low',
    social: 'low',
    unknown: 'low',
  });

/**
 * Severity → AivssPis (Prompt Injection Success rate) for Mitsuke
 * indicators. The 5-value `MitsukeSeverity` enum collapses into the
 * 3-value `AivssPis` enum:
 *
 * - CRITICAL / HIGH → `'high'` (>50% success in the wild — high-confidence
 *   indicator with active exploit signal)
 * - MEDIUM → `'medium'` (10–50% — calibrated mid-band)
 * - LOW / INFO → `'low'` (<10% — recon / reference / observed-only)
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<MitsukeSeverity, AivssPis>> =
  Object.freeze({
    CRITICAL: 'high',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'low',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-indicator
 * baseline). Per-impact decomposition is a follow-up when richer metadata
 * arrives.
 *
 * - CRITICAL / HIGH → `'high'` (full / large compromise of the dimension)
 * - MEDIUM → `'low'` (partial / bounded compromise)
 * - LOW / INFO → `'none'` (no impact, recon / reference only)
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<MitsukeSeverity, AivssImpact>> =
  Object.freeze({
    CRITICAL: 'high',
    HIGH: 'high',
    MEDIUM: 'low',
    LOW: 'none',
    INFO: 'none',
  });

/**
 * Default attack vector. Mitsuke indicators come from network-observed
 * threat feeds (passive DNS, honeypots, KEV, MISP, MITRE ATLAS, etc.) —
 * by definition network-reachable. Adjacent / local / physical are not
 * representable on the indicator surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Mitsuke is tuned for tier-1
 * (production user-facing) posture; this is the worst-case default.
 * Tier-2/3 calibration arrives when a run-context selector is plumbed
 * through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Mitsuke runs against threat intel
 * which by default is 'internal'-classified. Per-engagement override is
 * a follow-up when DSR classification is plumbed through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every `IndicatorType` to its {@link AttackKind}
 * bucket. Test GM-003 verifies the table is exhaustive against every
 * member of the `IndicatorType` closed union.
 *
 * Bucketing rationale (each indicator type → kind):
 *   - `ip` / `domain` — network-layer infrastructure indicators; these are
 *     the carrier hosts for injection-style attacks (C2 beacons, phishing
 *     hosts, OAuth-spoof origins). Bucket → `'injection'`.
 *   - `url` — direct injection vector (path-traversal probes, OAuth
 *     callback spoofs, plugin-registry spoofs all surface here).
 *     Bucket → `'injection'`.
 *   - `hash` — file-content indicator (trojaned binaries, droppers,
 *     supply-chain artefacts). Encoded payloads in their canonical form.
 *     Bucket → `'encoding'`.
 *   - `email` — phish lure / impersonation address. Single-shot social
 *     engineering vector. Bucket → `'social'`.
 *   - `pattern` — regex / string match flagging prompt-injection or
 *     policy-bypass language. Direct injection class. Bucket → `'injection'`.
 *   - `ttp` — MITRE ATLAS technique reference. ATLAS techniques in scope
 *     here describe override-style behaviours (jailbreak, evasion,
 *     reconnaissance discovery, ML query evasion). Bucket → `'override'`.
 *
 * UPDATING: when a new IndicatorType lands (search:
 * `export type IndicatorType = ...` in `MitsukeTabs.tsx`), add a row here
 * mapping it to the appropriate kind. Test GM-003 will fail to remind
 * future maintainers if a new type lacks a mapping.
 */
export const MITSUKE_TYPE_TO_KIND: Readonly<Record<IndicatorType, AttackKind>> =
  Object.freeze({
    ip: 'injection',
    domain: 'injection',
    url: 'injection',
    hash: 'encoding',
    email: 'social',
    pattern: 'injection',
    ttp: 'override',
  });

/**
 * Bucket a Mitsuke `IndicatorType` value into a closed {@link AttackKind}.
 *
 * Returns `'unknown'` for type values not present in
 * {@link MITSUKE_TYPE_TO_KIND}. Because `IndicatorType` is a closed union,
 * every concrete narrowing call resolves to a non-`'unknown'` kind today;
 * the `'unknown'` branch is belt-and-braces in case the union is extended
 * without a corresponding map update. This is the EXPLICIT unknown slot —
 * we do NOT silently fall through to a default kind that would mask a
 * missing mapping.
 */
export function bucketType(type: IndicatorType): AttackKind {
  const kind = MITSUKE_TYPE_TO_KIND[type];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a Mitsuke threat-indicator finding.
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Mitsuke finding shape (type + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Mitsuke triage findings AIVSS field
 */
export function findingToAivssMetrics(finding: MitsukeFinding): AivssMetrics {
  const kind = bucketType(finding.type);
  const attackComplexity = KIND_TO_AC[kind];
  const promptInjectionSuccess = SEVERITY_TO_PIS[finding.severity];
  const impact = SEVERITY_TO_IMPACT[finding.severity];

  return {
    attackVector: DEFAULT_ATTACK_VECTOR,
    attackComplexity,
    promptInjectionSuccess,
    modelCriticality: DEFAULT_MODEL_CRITICALITY,
    dataSensitivity: DEFAULT_DATA_SENSITIVITY,
    confidentialityImpact: impact,
    integrityImpact: impact,
    availabilityImpact: impact,
  };
}
