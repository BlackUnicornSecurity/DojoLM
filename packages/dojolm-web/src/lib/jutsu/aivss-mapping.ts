// SPDX-License-Identifier: Apache-2.0
/**
 * Jutsu model-registry finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-JUTSU — V1→V2 Restoration program (fifteenth
 * G.3 surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Jutsu Models registry rows
 * (rendered by `JutsuClient` in
 * `packages/dojolm-web/src/app/(shell)/admin/jutsu/JutsuClient.tsx`).
 *
 * Jutsu "findings" surface = the model registry rows on the Models tab.
 * Each row is a `SafeModelConfig` carrying a `safetyRisk` (closed 5-value
 * resilience-risk enum: CRITICAL / HIGH / MEDIUM / LOW / SAFE) + a model
 * `id` / `provider` / `model` triple. The `safetyRisk` is the model's
 * historical resilience classification — NOT a per-finding attack-class
 * signal. The Jutsu workbench's other tabs (Compare = compliance heatmap,
 * Jutsu = resilience belts, Coverage = coverage map) are aggregate views
 * that don't render per-finding rows; the chip slot lives on the Models
 * tab where each row IS a per-model entity.
 *
 * Jutsu domain note — model registry entries DO NOT carry an attack-class
 * field (the canonical attack-taxonomy bucket = jailbreak / encoding /
 * injection / override / social). The model registry is about model
 * IDENTITY (who built it, where it runs, what risk class), not about the
 * specific attack chains a model has been subjected to. This mirrors the
 * Ronin / Onigaeshi / Arena suppression precedents (where the available
 * closed enum was a lifecycle / observability proxy, NOT a real
 * attack-class). The SUPPRESSION pattern applies: client-side derivation
 * is INTENTIONALLY SUPPRESSED at the host wiring layer (band='none' until
 * `TICKET-G3-API-JUTSU` ships a server-side `model.attackClass` schema);
 * the mapper machinery is preserved here for forward-compatibility.
 *
 * Mapping strategy (the mapper still operates correctly when invoked
 * directly — the suppression is a host-wiring decision, NOT a mapper
 * defect):
 *   - finding.category (wide string at the client edge; structurally
 *     absent on the registry row today) is bucketed into the closed
 *     {@link AttackKind} taxonomy via {@link JUTSU_CATEGORY_TO_KIND}.
 *     Today the table is empty (no closed-enum source) so every call
 *     to {@link bucketCategory} resolves to the EXPLICIT `'unknown'`
 *     kind. When TICKET-G3-API-JUTSU ships an explicit `attackClass`
 *     field, the bucketing input migrates to that field and rows are
 *     added here.
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench / Sensei
 *     / Ronin / Amaterasu / Kotoba / Onigaeshi / Arena / Hattori /
 *     Sengoku mappings verbatim for cross-domain consistency).
 *   - finding.severity (closed 5-value `JutsuSeverity` enum, UPPERCASE:
 *     `'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE'` — mirrors the
 *     `SafetyRisk` declaration in `JutsuClient.tsx`) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (CRITICAL/HIGH → high,
 *         MEDIUM → medium, LOW/SAFE → low).
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (CRITICAL/HIGH → high, MEDIUM → low, LOW/SAFE → none).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Jutsu models are
 *     network-reachable LLM deployments — the registry's resolved target
 *     is one of: provider gateway URL / dashboard model config / local
 *     Ollama gateway, all network-reachable; adjacency / local /
 *     physical surface-area is not representable on the model registry
 *     row today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Jutsu IS the
 *     production-admin model lab; this is the worst-case default.
 *     Tier-2/3 calibration arrives when a per-model-tier selector is
 *     plumbed through).
 *   - dataSensitivity defaults to 'internal' (admin Jutsu surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/llm/models` response is a separate
 * follow-up (TICKET-G3-API-JUTSU). This file is the CLIENT-SIDE
 * derivation only, mirroring the prior fourteen G-3 surfaces' pattern.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Per-finding AIVSS field
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/atemi/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/kagami/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/buki/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/workbench/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/sensei/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/ronin/aivss-mapping.ts — sister module (suppression precedent)
 * @see packages/dojolm-web/src/lib/amaterasu/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/kotoba/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/onigaeshi/aivss-mapping.ts — sister module (suppression precedent)
 * @see packages/dojolm-web/src/lib/arena/aivss-mapping.ts — sister module (suppression precedent)
 * @see packages/dojolm-web/src/lib/hattori/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/sengoku/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/app/(shell)/admin/jutsu/JutsuClient.tsx — `SafetyRisk` host source
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
 * Closed 5-value Jutsu model-registry safety-risk enum, UPPERCASE.
 * Mirrors `SafetyRisk` declared in
 * `packages/dojolm-web/src/app/(shell)/admin/jutsu/JutsuClient.tsx`.
 *
 * Re-declared here (not imported as a type alias) to keep this mapping
 * module pure / unit-testable in isolation, mirroring the
 * `RoninFinding` / `OnigaeshiFinding` / `ArenaFinding` /
 * `SengokuFinding` declarations in the sister modules. The host client
 * narrows wire data through `isSafetyRisk` before passing it to the row
 * component, so this re-declaration stays in sync via the test
 * exhaustiveness check.
 *
 * Note: Jutsu uses UPPERCASE convention (mirrors V1 wire shape and
 * `SafetyRisk` in `JutsuClient.tsx`) — distinct from the lowercase
 * convention of every other G-3 sister mapper. The closed-enum mapping
 * tables are case-sensitive; the host's `isSafetyRisk` gate enforces
 * UPPERCASE at the fetch boundary.
 */
export type JutsuSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'SAFE';

/**
 * Canonical readonly array of every {@link JutsuSeverity} value. Used
 * by tests for exhaustiveness checks against the closed-enum maps.
 */
export const JUTSU_SEVERITIES: readonly JutsuSeverity[] = Object.freeze([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'SAFE',
]);

/**
 * Local Finding shape used by the Jutsu model-registry surface.
 * Mirrors the narrowed subset of the `SafeModelConfig` declared in
 * `JutsuClient.tsx` (sanitized at fetch via `sanitizeModel` /
 * `isSafetyRisk`) that the AIVSS mapping consumes — `category` (any
 * future attack-class label) + `severity` (the model's safetyRisk) are
 * the inputs.
 *
 * Re-declared here (not imported as `Pick<SafeModelConfig, ...>`) to
 * keep this mapping module pure / unit-testable in isolation, mirroring
 * the sister modules.
 *
 * `category` is typed as `string` (not a closed literal union) because
 * the model registry row does NOT carry an attack-class field today.
 * The closed-enum gate in {@link JUTSU_CATEGORY_TO_KIND} is empty (no
 * source enum), so every concrete call resolves to the EXPLICIT
 * `'unknown'` kind via {@link bucketCategory}. When TICKET-G3-API-JUTSU
 * ships a server-side `model.attackClass` field, the bucketing input
 * migrates to that field and the closed-enum source is added here.
 *
 * `severity` is the closed 5-value {@link JutsuSeverity} enum (UPPERCASE)
 * — the only closed-enum signal the model registry carries today. The
 * mapper still produces a valid AIVSS metrics tuple from severity alone
 * (PIS + impact triple), with AC defaulting to 'low' via the 'unknown'
 * kind path.
 */
export interface JutsuFinding {
  readonly category: string;
  readonly severity: JutsuSeverity;
}

/**
 * Closed taxonomy of Jutsu-attack kinds — bucketing layer between any
 * future attack-class signal and the 2-state AivssAttackComplexity
 * enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami + Buki + Workbench + Sensei + Ronin + Amaterasu +
 * Kotoba + Onigaeshi + Arena + Hattori + Sengoku sister modules so
 * cross-domain consumers can later share a hoisted map. Per-domain
 * divergence today: Jutsu has NO concrete attack-class source, so
 * every row resolves to `'unknown'` until TICKET-G3-API-JUTSU ships.
 *
 * `'unknown'` is the EXPLICIT slot for a `category` string that has no
 * closed-enum source today (or that bypasses any future server-side
 * gate) — NOT a silent default.
 */
export type AttackKind =
  | 'jailbreak'
  | 'encoding'
  | 'injection'
  | 'override'
  | 'social'
  | 'unknown';

/**
 * AttackKind → AivssAttackComplexity mapping (mirrors scanner / Mitsuke
 * / Atemi / Kagami / Buki / Workbench / Sensei / Ronin / Amaterasu /
 * Kotoba / Onigaeshi / Arena / Hattori / Sengoku versions verbatim —
 * kept duplicated rather than hoisted because per-domain divergence on
 * the input side is large enough that a hoist would couple the fifteen
 * domains' input enums).
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
 * Severity → AivssPis (Prompt Injection Success rate) for Jutsu model
 * registry findings. The 5-value {@link JutsuSeverity} enum (UPPERCASE)
 * maps to the 3-value `AivssPis` enum:
 *
 * - CRITICAL / HIGH → `'high'` (>50% — high-resilience-risk model;
 *   historically vulnerable to prompt-injection probes)
 * - MEDIUM → `'medium'` (10–50% — calibrated mid-band)
 * - LOW / SAFE → `'low'` (<10% — high-resilience model; minimal
 *   historical injection-success signal)
 *
 * SAFE compresses to PIS=low identical to LOW because the 3-state PIS
 * enum cannot represent the "no observed injection success" nuance
 * separately from "low observed rate".
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<JutsuSeverity, AivssPis>> =
  Object.freeze({
    CRITICAL: 'high',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    SAFE: 'low',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - CRITICAL / HIGH → `'high'` (full / large compromise of the
 *   dimension — historically demonstrated under attack)
 * - MEDIUM → `'low'` (partial / bounded compromise)
 * - LOW / SAFE → `'none'` (no impact, recon / reference only)
 *
 * Mirrors the sister 5-value mappings verbatim, modulo the UPPERCASE
 * convention.
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<JutsuSeverity, AivssImpact>> =
  Object.freeze({
    CRITICAL: 'high',
    HIGH: 'high',
    MEDIUM: 'low',
    LOW: 'none',
    SAFE: 'none',
  });

/**
 * Default attack vector. Jutsu models are network-reachable LLM
 * deployments — the registry's resolved target is one of:
 *   - external provider URL (network-reachable LLM gateway)
 *   - dashboard model (network-reachable internal model config)
 *   - local Ollama (network-reachable on localhost)
 * adjacency / local / physical surface-area is not representable on
 * the model registry surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Jutsu IS the production-admin
 * model lab; this is the worst-case default. Tier-2/3 calibration
 * arrives when a per-model-tier selector is plumbed through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Jutsu runs against in-flight model
 * registry payloads which by default are 'internal'-classified.
 * Per-engagement override is a follow-up when DSR classification
 * plumbs through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from any future Jutsu attack-class label to its
 * {@link AttackKind} bucket. Test GJ-003 verifies the table is
 * exhaustive against any closed-enum source that lands in future.
 *
 * Today this table is INTENTIONALLY EMPTY — the model registry row
 * shape does not carry an attack-class field, so there is no concrete
 * closed-enum source to enumerate. Every call to {@link bucketCategory}
 * resolves to the EXPLICIT `'unknown'` kind via the `??` fallback.
 *
 * Bucketing rationale (when a future attack-class source ships):
 *   - When `TICKET-G3-API-JUTSU` lands a server-side
 *     `model.attackClass` field on `/api/llm/models`, this table
 *     becomes the bucketing source. Until then, the SUPPRESSION
 *     pattern applies at the host wiring layer (band='none').
 *
 * UPDATING: when an attack-class source lands, search:
 * `model.attackClass` in `JutsuClient.tsx` and `/api/llm/models`,
 * then add closed-enum rows here mapping each attack-class value to
 * the appropriate {@link AttackKind}. Test GJ-003 will fail to
 * remind future maintainers to update the host wiring + suppression
 * to live derivation.
 */
export const JUTSU_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({});

/**
 * Bucket a raw `category` string (Jutsu attack-class, today absent)
 * into a closed {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link JUTSU_CATEGORY_TO_KIND}. Today the table is empty so every
 * concrete narrowing call resolves to `'unknown'`. When a future
 * server-side `attackClass` field ships, the table populates and live
 * bucketing replaces the universal `'unknown'` fallback. This is the
 * EXPLICIT unknown slot — we do NOT silently fall through to a default
 * kind that would mask a missing mapping.
 *
 * Uses `Object.hasOwn` to avoid prototype-chain pollution (e.g. a
 * `__proto__` category string would otherwise resolve to the
 * prototype object, NOT `undefined`, bypassing the `??` fallback).
 */
export function bucketCategory(category: string): AttackKind {
  if (!Object.hasOwn(JUTSU_CATEGORY_TO_KIND, category)) return 'unknown';
  const kind = JUTSU_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a Jutsu model-registry finding.
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * Today the host client SUPPRESSES the live derivation (chip renders
 * band='none' on every Models row) per the Ronin / Onigaeshi / Arena
 * suppression precedents — model-registry rows do not carry an
 * attack-class signal, and a chip derived solely from `safetyRisk`
 * (which is a model-property, not a per-finding attack signal) would
 * mislead operators on the registry view. The mapper machinery is
 * preserved so once `TICKET-G3-API-JUTSU` ships, the host migrates to
 * live derivation with no further mapper changes.
 *
 * @param finding — narrow Jutsu finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Jutsu model registry AIVSS field
 */
export function findingToAivssMetrics(finding: JutsuFinding): AivssMetrics {
  const kind = bucketCategory(finding.category);
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
