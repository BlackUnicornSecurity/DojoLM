// SPDX-License-Identifier: Apache-2.0
/**
 * Hattori prompt-hardening weakness → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-HATTORI — V1→V2 Restoration program (thirteenth
 * G.3 surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-weakness
 * {@link AivssScore} for chip rendering on the Hattori hardening surface
 * (the per-line + structural weakness rows the `/api/guard/hardening`
 * endpoint returns).
 *
 * Hattori "findings" surface = the {@link HardeningWeakness} rows produced
 * by the `/api/guard/hardening` POST endpoint. Each row carries a closed
 * 4-value {@link HardeningSeverity} enum (`'critical' | 'high' | 'medium' |
 * 'low'`, lowercase, no INFO band) plus a description + optional source
 * line. Unlike sister G-3 surfaces the weakness rows do NOT carry an
 * attack-class taxonomy — every weakness is by definition a system-prompt
 * injection / hardening signal, which means there is exactly ONE
 * domain-correct {@link AttackKind} bucket: `'injection'`.
 *
 * Mapping strategy:
 *   - All Hattori weaknesses bucket into the `'injection'` AttackKind via
 *     {@link bucketWeakness} — single-shot prompt-injection signal at the
 *     model layer. No category-based dispatch table because the source
 *     enum has no category dimension; the `'unknown'` slot in the {@link
 *     AttackKind} closed union is reserved as a belt-and-braces escape
 *     hatch in case a future weakness shape lands with a category field.
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami mappings for cross-domain
 *     consistency — `'injection'` resolves to `'low'`).
 *   - finding.severity (closed 4-value `HardeningSeverity` enum) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (critical/high → high,
 *         medium → medium, low → low). The 4-value enum has no INFO
 *         band; sister modules' 5-value mappings collapse INFO into
 *         the same `'low'` bucket as LOW so domain alignment is
 *         preserved.
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (critical/high → high, medium → low, low → none).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Hattori hardens system prompts
 *     evaluated against network-reachable LLM deployments — adjacency /
 *     local / physical surface-area is not representable on the
 *     prompt-hardening surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Hattori runs against
 *     production-fingerprint posture; tier-2/3 calibration is a follow-up
 *     when a per-engagement run-context selector plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Hattori surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/guard/hardening` response is a separate
 * follow-up (TICKET-G3-API). This file is the CLIENT-SIDE derivation only,
 * mirroring the prior twelve G-3 surfaces' pattern (Scanner, Mitsuke,
 * Atemi, Kagami, Buki, Workbench, Sensei, Ronin, Amaterasu, Kotoba,
 * Onigaeshi, Arena).
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Per-finding AIVSS field
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/atemi/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/kagami/aivss-mapping.ts — sister module
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

/**
 * Closed 4-value Hattori weakness severity enum, lowercase. Sourced from
 * the `HardeningWeakness` shape in
 * `packages/dojolm-web/src/app/(shell)/admin/hattori/HattoriClient.tsx`
 * (kept narrowed at the fetch boundary by `sanitizeWeakness` /
 * `isHardeningSeverity`).
 *
 * Re-declared here (not imported as a type alias) to keep this mapping
 * module pure / unit-testable in isolation, mirroring the
 * `ScanFinding` + `MitsukeFinding` + `AtemiFinding` + `KagamiFinding`
 * declarations in the sister modules.
 */
export type HattoriSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Canonical readonly array of every {@link HattoriSeverity} value. Used
 * by tests for exhaustiveness checks against the closed-enum maps.
 */
export const HATTORI_SEVERITIES: readonly HattoriSeverity[] = Object.freeze([
  'critical',
  'high',
  'medium',
  'low',
]);

/**
 * Local Finding shape used by the Hattori hardening surface. Mirrors the
 * narrowed subset of `HardeningWeakness` (sanitized at fetch in
 * `HattoriClient.tsx`) that the AIVSS mapping consumes — `severity` is
 * the sufficient input.
 *
 * Re-declared here (not imported as `Pick<HardeningWeakness, ...>`) to
 * keep this mapping module pure / unit-testable in isolation, mirroring
 * the sister modules.
 */
export interface HattoriFinding {
  readonly severity: HattoriSeverity;
}

/**
 * Closed taxonomy of Hattori-weakness kinds — bucketing layer between
 * the (degenerate, single-domain) Hattori weakness set and the 2-state
 * AivssAttackComplexity enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami sister modules so cross-domain consumers can later share
 * a hoisted map. Per-domain divergence today: every Hattori weakness
 * resolves to `'injection'` because the source surface is by definition
 * a prompt-injection hardening pipeline — the kind dimension has no
 * meaningful sub-classification on this surface.
 *
 * `'unknown'` is the EXPLICIT slot for a hypothetical future weakness
 * shape that lands with a sub-classification not covered by the
 * canonical injection bucket — NOT a silent default. Today every
 * concrete weakness resolves to `'injection'`; the slot is
 * belt-and-braces against future API extension landing without a
 * mapping update.
 */
export type AttackKind =
  | 'jailbreak'
  | 'encoding'
  | 'injection'
  | 'override'
  | 'social'
  | 'unknown';

/**
 * AttackKind → AivssAttackComplexity mapping (mirrors scanner / Mitsuke /
 * Atemi / Kagami versions verbatim — kept duplicated rather than hoisted
 * because per-domain divergence on the input side is large enough that a
 * hoist would couple the domains' input enums).
 *
 * - `jailbreak` → `'high'` (typically requires multi-turn or staged setup)
 * - `encoding` / `injection` / `override` / `social` → `'low'` (single-shot)
 * - `unknown` → `'low'` (conservative — assume the easier case for an
 *   un-categorized finding so the AIVSS score does not understate
 *   severity).
 *
 * @see ADR-0097 §1 metric 2 — AC closed enum
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/atemi/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/kagami/aivss-mapping.ts — sister table
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
 * Severity → AivssPis (Prompt Injection Success rate) for Hattori
 * weaknesses. The 4-value `HattoriSeverity` enum collapses into the
 * 3-value `AivssPis` enum (mirrors the sister modules' 5-value mapping
 * minus the INFO band — INFO maps to `'low'` in the sister modules so
 * the 4-value Hattori mapping preserves alignment by collapsing `low`
 * to `'low'` directly):
 *
 * - critical / high → `'high'` (>50% success — high-confidence indicator
 *   the hardener flagged as a structural weakness in the prompt)
 * - medium → `'medium'` (10–50% — calibrated mid-band)
 * - low → `'low'` (<10% — recon / baseline / observed-only)
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<HattoriSeverity, AivssPis>> =
  Object.freeze({
    critical: 'high',
    high: 'high',
    medium: 'medium',
    low: 'low',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - critical / high → `'high'` (full / large compromise of the dimension)
 * - medium → `'low'` (partial / bounded compromise)
 * - low → `'none'` (no impact, recon / baseline only)
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<HattoriSeverity, AivssImpact>> =
  Object.freeze({
    critical: 'high',
    high: 'high',
    medium: 'low',
    low: 'none',
  });

/**
 * Default attack vector. Hattori hardens system prompts evaluated against
 * network-reachable LLM deployments; adjacent / local / physical
 * surface-area is not representable on the prompt-hardening surface
 * today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Hattori is tuned for tier-1
 * (production user-facing) posture; this is the worst-case default.
 * Tier-2/3 calibration arrives when a run-context selector is plumbed
 * through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Hattori runs against in-flight LLM
 * traffic which by default is 'internal'-classified. Per-engagement
 * override is a follow-up when DSR classification plumbs through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Bucket a Hattori weakness into a closed {@link AttackKind}.
 *
 * Returns `'injection'` for every concrete Hattori weakness today —
 * the source surface is by definition a prompt-injection hardening
 * pipeline so there is no further category dimension to dispatch on.
 *
 * The function takes the full {@link HattoriFinding} (not just severity)
 * so future maintainers can extend the dispatch when the API begins
 * emitting a `category` / `weaknessType` field alongside `severity`.
 * When that lands, replace the unconditional return with a closed-enum
 * dispatch table mirroring the sister modules' `*_CATEGORY_TO_KIND`
 * shape; the `'unknown'` slot in {@link AttackKind} catches any future
 * enum extension that lands without a mapping update.
 */
export function bucketWeakness(_finding: HattoriFinding): AttackKind {
  return 'injection';
}

/**
 * Derive {@link AivssMetrics} from a Hattori weakness (per-line or
 * structural row).
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Hattori weakness shape (severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Hattori weaknesses AIVSS field
 */
export function findingToAivssMetrics(finding: HattoriFinding): AivssMetrics {
  const kind = bucketWeakness(finding);
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
