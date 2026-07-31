// SPDX-License-Identifier: Apache-2.0
/**
 * Atemi attack-tool / playbook → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-ATEMI — V1→V2 Restoration program (third G.3 surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Atemi skills library /
 * playbooks tables.
 *
 * Atemi "findings" surface = the SkillsLibraryTab list of Atemi attack
 * tools (closest analog to the scanner findings table — rows with severity
 * + an attack-class taxonomy). Each tool row carries an
 * {@link AtemiAttackClass} (8-value closed enum) + {@link AtemiSeverity}
 * (5-value closed enum); both enums are sanitized at fetch time before
 * the row reaches this mapper.
 *
 * Mapping strategy:
 *   - finding.category (closed 8-value `AtemiAttackClass` enum) is bucketed
 *     into the closed {@link AttackKind} taxonomy via
 *     {@link ATEMI_CATEGORY_TO_KIND}. The mapping is exhaustive across
 *     every AtemiAttackClass value — `'unknown'` is the EXPLICIT slot for
 *     a hypothetical future enum extension landing without a map update
 *     (defensive belt-and-braces, NOT a silent default).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke mappings for cross-domain consistency).
 *   - finding.severity (closed 5-value `AtemiSeverity` enum) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (CRITICAL/HIGH → high,
 *         MEDIUM → medium, LOW/INFO → low — mirrors Mitsuke 5-value mapping)
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (CRITICAL/HIGH → high, MEDIUM → low, LOW/INFO → none).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Atemi attack tools target
 *     network-reachable LLM deployments — DojoLM, SampleBravo, SampleAlpha,
 *     SampleDelta, SampleCharlie; adjacency / local / physical surface-area is
 *     not representable on the attack-tool surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Atemi runs against
 *     production-incident posture; tier-2/3 calibration is a follow-up
 *     when a per-engagement run-context selector plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Atemi surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/atemi/attack-tools` response is a
 * separate follow-up (TICKET-G3-API). This file is the CLIENT-SIDE
 * derivation only, mirroring the G-3-SCANNER + G-3-MITSUKE pattern.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Per-finding AIVSS field
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister module
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
  AtemiAttackClass,
  AtemiSeverity,
} from '@/app/(shell)/admin/atemi/AtemiTabs';

/**
 * Local Finding shape used by the Atemi skills-library row. Mirrors the
 * narrowed subset of `AttackToolLite` (from `AtemiTabs.tsx`) that the AIVSS
 * mapping consumes — `category` (= `attackClass`) + `severity` are the
 * sufficient inputs.
 *
 * Re-declared here (not imported as `Pick<AttackToolLite, ...>`) to keep
 * this mapping module pure / unit-testable in isolation, mirroring the
 * `ScanFinding` + `MitsukeFinding` declarations in the sister modules.
 *
 * The field is named `category` (not `attackClass`) so the mapper has the
 * same call-site shape as the scanner mapper — consumers pass
 * `{ category: tool.attackClass, severity: tool.severity }` at the row
 * level (see `AttackToolRow.tsx`).
 */
export interface AtemiFinding {
  readonly category: AtemiAttackClass;
  readonly severity: AtemiSeverity;
}

/**
 * Closed taxonomy of Atemi-attack kinds — bucketing layer between the
 * 8-value `AtemiAttackClass` enum and the 2-state AivssAttackComplexity
 * enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke
 * sister modules so cross-domain consumers can later share a hoisted
 * map. Per-domain divergence today: every Atemi attack class slots
 * cleanly into one of the 5 named kinds, but we keep the closed shape
 * verbatim so downstream {@link KIND_TO_AC} stays compatible.
 *
 * `'unknown'` is the EXPLICIT slot for a hypothetical future
 * `AtemiAttackClass` value that lands without a row added here — NOT a
 * silent default. Because `AtemiAttackClass` is a closed union today,
 * every concrete value resolves to a non-`'unknown'` kind; the slot is
 * belt-and-braces against future enum extension landing without a
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
 * AttackKind → AivssAttackComplexity mapping (mirrors scanner / Mitsuke
 * versions verbatim — kept duplicated rather than hoisted because
 * per-domain divergence on the input side is large enough that a hoist
 * would couple the three domains' input enums).
 *
 * - `jailbreak` → `'high'` (typically requires multi-turn or staged setup)
 * - `encoding` / `injection` / `override` / `social` → `'low'` (single-shot)
 * - `unknown` → `'low'` (conservative — assume the easier case for an
 *   un-categorized finding so the AIVSS score does not understate severity).
 *
 * @see ADR-0097 §1 metric 2 — AC closed enum
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister table
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
 * Severity → AivssPis (Prompt Injection Success rate) for Atemi findings.
 * The 5-value `AtemiSeverity` enum collapses into the 3-value `AivssPis`
 * enum (mirrors Mitsuke 5-value mapping verbatim):
 *
 * - CRITICAL / HIGH → `'high'` (>50% success — high-confidence indicator
 *   with active exploit signal in the wild)
 * - MEDIUM → `'medium'` (10–50% — calibrated mid-band)
 * - LOW / INFO → `'low'` (<10% — recon / reference / observed-only)
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<AtemiSeverity, AivssPis>> =
  Object.freeze({
    CRITICAL: 'high',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'low',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - CRITICAL / HIGH → `'high'` (full / large compromise of the dimension)
 * - MEDIUM → `'low'` (partial / bounded compromise)
 * - LOW / INFO → `'none'` (no impact, recon / reference only)
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<AtemiSeverity, AivssImpact>> =
  Object.freeze({
    CRITICAL: 'high',
    HIGH: 'high',
    MEDIUM: 'low',
    LOW: 'none',
    INFO: 'none',
  });

/**
 * Default attack vector. Atemi attack tools target network-reachable
 * LLM deployments (DojoLM / SampleBravo / SampleAlpha / SampleDelta / SampleCharlie);
 * adjacent / local / physical surface-area is not representable on the
 * attack-tool surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Atemi is tuned for tier-1
 * (production user-facing) posture; this is the worst-case default.
 * Tier-2/3 calibration arrives when a run-context selector is plumbed
 * through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Atemi runs against in-flight LLM
 * traffic which by default is 'internal'-classified. Per-engagement
 * override is a follow-up when DSR classification plumbs through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every `AtemiAttackClass` to its
 * {@link AttackKind} bucket. Test GA-003 verifies the table is
 * exhaustive against every member of the `AtemiAttackClass` closed
 * union.
 *
 * Bucketing rationale (each attack class → kind):
 *   - `prompt-injection` — direct prompt injection. The injection class
 *     by definition. Bucket → `'injection'`.
 *   - `jailbreak` — multi-turn / framing-based safety bypass. Typical
 *     jailbreak attacks need staged setup. Bucket → `'jailbreak'`.
 *   - `extraction` — context / secret / training-data extraction. Direct
 *     embedding into the prompt + parse-out style attack. Bucket →
 *     `'injection'`.
 *   - `tool-abuse` — tool-call override / function-call hijack. Flips
 *     authority of the tool registry — system-level constraint flip.
 *     Bucket → `'override'`.
 *   - `multi-modal` — hidden prompt in image / audio / video. Encoded
 *     payload form. Bucket → `'encoding'`.
 *   - `agentic-loop` — runaway tool-call loops / scope expansion. System
 *     constraint flip (the safety-loop limiter is the constraint).
 *     Bucket → `'override'`.
 *   - `compliance-bypass` — role-play / pretext to loosen compliance
 *     gates. Single-shot social-engineering vector at the model layer.
 *     Bucket → `'social'`.
 *   - `reconnaissance` — passive enumeration of tools / sessions /
 *     fingerprint. Direct injection class (the recon probe is
 *     injected into the prompt). Bucket → `'injection'`.
 *
 * UPDATING: when a new AtemiAttackClass lands (search:
 * `export const ATEMI_ATTACK_CLASSES = [` in `AtemiTabs.tsx`), add a
 * row here mapping it to the appropriate kind. Test GA-003 will fail
 * to remind future maintainers if a new class lacks a mapping.
 */
export const ATEMI_CATEGORY_TO_KIND: Readonly<
  Record<AtemiAttackClass, AttackKind>
> = Object.freeze({
  'prompt-injection': 'injection',
  jailbreak: 'jailbreak',
  extraction: 'injection',
  'tool-abuse': 'override',
  'multi-modal': 'encoding',
  'agentic-loop': 'override',
  'compliance-bypass': 'social',
  reconnaissance: 'injection',
});

/**
 * Bucket an `AtemiAttackClass` value into a closed {@link AttackKind}.
 *
 * Returns `'unknown'` for class values not present in
 * {@link ATEMI_CATEGORY_TO_KIND}. Because `AtemiAttackClass` is a closed
 * union, every concrete narrowing call resolves to a non-`'unknown'`
 * kind today; the `'unknown'` branch is belt-and-braces in case the
 * union is extended without a corresponding map update. This is the
 * EXPLICIT unknown slot — we do NOT silently fall through to a default
 * kind that would mask a missing mapping.
 */
export function bucketCategory(category: AtemiAttackClass): AttackKind {
  const kind = ATEMI_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from an Atemi finding (attack-tool row).
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Atemi finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Atemi findings AIVSS field
 */
export function findingToAivssMetrics(finding: AtemiFinding): AivssMetrics {
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
