// SPDX-License-Identifier: Apache-2.0
/**
 * Kotoba prompt-rubric finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-KOTOBA — V1→V2 Restoration program (tenth G.3
 * surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Kotoba prompt-rubric findings
 * surface (the issues list rendered by `StudioTab` in `KotobaClient.tsx`).
 *
 * Kotoba "findings" surface = the per-rubric-category issues list rendered
 * inside `StudioTab` after a `/api/kotoba/score` call. Each issue carries a
 * `RubricCategoryId` (14-value closed enum from `lib/kotoba/rubric.ts`) +
 * `IssueSeverity` (3-value lowercase enum: `'high' | 'medium' | 'low'`).
 * The server-side `analyzePrompt` enforces the closed enum on emit; the
 * client-side `sanitizeIssue` widens `categoryId` to `string` for
 * defence-in-depth, so this mapper accepts a wide `string` for `category`
 * and falls through to the EXPLICIT `'unknown'` kind for any value outside
 * the closed table (mirrors the scanner / Mitsuke / Atemi / Kagami / Buki /
 * Workbench / Sensei / Ronin / Amaterasu sister modules).
 *
 * Kotoba domain note — Kotoba findings carry an explicit security-domain
 * categoryId (boundary-definition / defense-layers / pii-handling / etc.).
 * Each rubric category maps cleanly to a single attack-kind primitive
 * (e.g. `boundary-definition` → `'override'` because a missing refusal /
 * boundary statement leaves the model open to constraint-override attacks;
 * `input-handling` → `'injection'` because missing untrusted-input handling
 * is the canonical prompt-injection vulnerability). Unlike Ronin (where
 * `SubmissionStatus` was a lifecycle and not an attack-class), Kotoba's
 * `RubricCategoryId` IS an attack-class taxonomy at heart — each category
 * names the OWASP / ATLAS family the finding falls into. Live derivation
 * is therefore appropriate (no Ronin-style suppression).
 *
 * Severity note — Kotoba uses a 3-value `IssueSeverity` enum (no CRITICAL
 * or INFO levels), unlike the 5-value enums in the sister surfaces. The
 * `SEVERITY_TO_PIS` and `SEVERITY_TO_IMPACT` tables are therefore 3-row
 * (high → high, medium → medium, low → low for PIS; high → high,
 * medium → low, low → none for impact) — the natural collapse of the
 * 5-value pattern.
 *
 * Mapping strategy:
 *   - finding.category (wide `string` at the client edge; closed
 *     `RubricCategoryId` 14-value enum at the server edge) is bucketed
 *     into the closed {@link AttackKind} taxonomy via
 *     {@link KOTOBA_CATEGORY_TO_KIND}. The mapping is exhaustive across
 *     every `RubricCategoryId` value; values outside the closed enum
 *     fall through to the EXPLICIT `'unknown'` kind (NOT a silent
 *     default).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench / Sensei /
 *     Ronin / Amaterasu mappings verbatim for cross-domain consistency).
 *   - finding.severity (closed 3-value `IssueSeverity` enum, lowercase:
 *     `'high' | 'medium' | 'low'`) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (high → high, medium →
 *         medium, low → low — natural 3-value collapse of the 5-value
 *         pattern)
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (high → high, medium → low, low → none — natural collapse).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Kotoba evaluates system prompts
 *     destined for network-reachable LLM deployments — the rubric scores
 *     the prompt-hardening posture against attacks delivered over the
 *     wire; adjacency / local / physical surface-area is not
 *     representable on the rubric surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Kotoba runs against
 *     production-prompt posture; tier-2/3 calibration is a follow-up
 *     when a per-engagement run-context selector plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Kotoba surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/kotoba/score` response is a separate
 * follow-up (TICKET-G3-API). This file is the CLIENT-SIDE derivation only,
 * mirroring the G-3-SCANNER + G-3-MITSUKE + G-3-ATEMI + G-3-KAGAMI +
 * G-3-BUKI + G-3-WORKBENCH + G-3-SENSEI + G-3-RONIN + G-3-AMATERASU
 * pattern.
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
 * @see packages/dojolm-web/src/lib/ronin/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/kotoba/rubric.ts — RubricCategoryId / IssueSeverity source
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
 * Closed 3-value Kotoba issue severity enum, lowercase. Mirrors
 * `IssueSeverity` declared in `packages/dojolm-web/src/lib/kotoba/rubric.ts`.
 *
 * Re-declared here (not imported) to keep this mapping module pure /
 * unit-testable in isolation, mirroring the sister modules. The host
 * client narrows wire data through `isIssueSeverity` before passing it
 * to the row component, so this re-declaration stays in sync via the
 * exhaustiveness test in `aivss-mapping.test.ts`.
 *
 * Note: 3 values, NOT 5 — Kotoba does not surface `'critical'` or
 * `'info'`. The {@link SEVERITY_TO_PIS} / {@link SEVERITY_TO_IMPACT}
 * tables are correspondingly 3-row.
 */
export type KotobaSeverity = 'high' | 'medium' | 'low';

/**
 * Closed 14-value Kotoba rubric category enum, lowercase-kebab. Mirrors
 * `RubricCategoryId` declared in `lib/kotoba/rubric.ts` (sourced from
 * `RUBRIC_CATEGORIES`). Used as the bucketing input for the AttackKind
 * taxonomy.
 *
 * Re-declared here as a local type union (not imported) to keep the
 * mapping module pure / unit-testable in isolation. New categories that
 * ship in `rubric.ts` without a row in {@link KOTOBA_CATEGORY_TO_KIND}
 * will trip GK2-003 (the exhaustiveness test) until folded into the map.
 */
export type KotobaCategory =
  | 'boundary-definition'
  | 'role-clarity'
  | 'priority-ordering'
  | 'output-constraints'
  | 'defense-layers'
  | 'input-handling'
  | 'tool-use-safety'
  | 'rag-safety'
  | 'cost-controls'
  | 'pii-handling'
  | 'memory-state-safety'
  | 'multi-modal-safety'
  | 'agentic-workflow-safety'
  | 'alignment-stability';

/**
 * Local Finding shape used by the Kotoba issues-list surface.
 * Mirrors the narrowed subset of the `RubricIssue` declared in
 * `KotobaTabs.tsx` (sanitized at fetch in `sanitizeIssue`) that the
 * AIVSS mapping consumes — `category` (the issue's `categoryId`) +
 * `severity` are the sufficient inputs.
 *
 * Re-declared here (not imported as `Pick<RubricIssue, ...>`) to
 * keep this mapping module pure / unit-testable in isolation, mirroring
 * the sister modules.
 *
 * `category` is typed as `string` (not the closed `KotobaCategory`
 * literal union) so the mapper accepts the widened client-edge shape.
 * The closed enum is enforced server-side by `analyzePrompt`; `'unknown'`
 * is the explicit fallback for any value that bypasses the server-side
 * enforcement (defence-in-depth for the client-edge sanitization layer
 * which widens `categoryId` to `string` in `KotobaTabs.tsx`).
 */
export interface KotobaFinding {
  readonly category: string;
  readonly severity: KotobaSeverity;
}

/**
 * Closed taxonomy of Kotoba-attack kinds — bucketing layer between the
 * 14-value `KotobaCategory` enum and the 2-state AivssAttackComplexity
 * enum.
 *
 * Same {@link AttackKind} closed-enum shape as the sister modules so
 * cross-domain consumers can later share a hoisted map. Per-domain
 * divergence today: each Kotoba category slots cleanly into the named
 * security-domain primitive that the rubric category is designed to
 * detect (e.g. `input-handling` → `'injection'` because the category
 * scores the prompt's defenses against indirect prompt injection).
 *
 * `'unknown'` is the EXPLICIT slot for a `category` string that bypasses
 * the server-side closed-enum gate (defence-in-depth for the client-edge
 * sanitization layer) — NOT a silent default.
 */
export type AttackKind =
  | 'jailbreak'
  | 'encoding'
  | 'injection'
  | 'override'
  | 'social'
  | 'unknown';

/**
 * AttackKind → AivssAttackComplexity mapping (mirrors all sister modules
 * verbatim — kept duplicated rather than hoisted because per-domain
 * divergence on the input side is large enough that a hoist would couple
 * the ten domains' input enums).
 *
 * - `jailbreak` → `'high'` (typically requires multi-turn or staged setup)
 * - `encoding` / `injection` / `override` / `social` → `'low'` (single-shot)
 * - `unknown` → `'low'` (conservative — assume the easier case for an
 *   un-categorized finding so the AIVSS score does not understate severity).
 *
 * @see ADR-0097 §1 metric 2 — AC closed enum
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/atemi/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/kagami/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/buki/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/workbench/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/sensei/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/ronin/aivss-mapping.ts — sister table
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
 * Severity → AivssPis (Prompt Injection Success rate) for Kotoba issues.
 * The 3-value `KotobaSeverity` enum maps to the 3-value `AivssPis` enum
 * via the natural collapse of the sister 5-value pattern (CRITICAL/HIGH
 * → high; MEDIUM → medium; LOW/INFO → low). Kotoba's 3-value enum
 * doesn't include CRITICAL or INFO so the mapping is one-to-one.
 *
 * - high → `'high'` (>50% success — e.g. missing PII redaction directly
 *   exposes secrets when an attacker probes the prompt)
 * - medium → `'medium'` (10–50% — calibrated mid-band)
 * - low → `'low'` (<10% — recon / reference / observed-only)
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<KotobaSeverity, AivssPis>> =
  Object.freeze({
    high: 'high',
    medium: 'medium',
    low: 'low',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - high → `'high'` (full / large compromise of the dimension)
 * - medium → `'low'` (partial / bounded compromise)
 * - low → `'none'` (no impact, recon / reference only)
 *
 * Mirrors the sister 5-value mappings via the natural 3-value collapse
 * (CRITICAL/HIGH → high; MEDIUM → low; LOW/INFO → none).
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<KotobaSeverity, AivssImpact>> =
  Object.freeze({
    high: 'high',
    medium: 'low',
    low: 'none',
  });

/**
 * Default attack vector. Kotoba scores prompt-hardening posture for
 * network-reachable LLM deployments; the rubric is tuned for prompts
 * destined to handle wire traffic. Adjacency / local / physical
 * surface-area is not representable on the prompt-rubric surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Kotoba is the production-prompt
 * authoring workbench; this is the worst-case default. Tier-2/3
 * calibration arrives when a run-context selector is plumbed through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Kotoba runs against in-flight
 * system-prompt drafts which by default are 'internal'-classified.
 * Per-engagement override is a follow-up when DSR classification
 * plumbs through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every `KotobaCategory` (14 rubric categories
 * sourced from `RUBRIC_CATEGORIES` in `lib/kotoba/rubric.ts`) to its
 * {@link AttackKind} bucket. Test GK2-003 verifies the table is
 * exhaustive against every member of the closed union.
 *
 * Bucketing rationale (each rubric category → kind):
 *   - `boundary-definition` — missing refusal / out-of-scope language
 *     leaves the model open to constraint-override attacks (the
 *     "ignore prior instructions" / "override your rules" family).
 *     Bucket → `'override'`.
 *   - `role-clarity` — missing identity / role lock leaves the model
 *     open to social-engineering pretexts ("act as my admin", role-
 *     pretext dressing). Bucket → `'social'`.
 *   - `priority-ordering` — missing safety-section ordering means
 *     safety rules sit below task instructions and can be overridden
 *     by injected payloads in the task region. Bucket → `'override'`.
 *   - `output-constraints` — missing format / length bounds enables
 *     encoded payload smuggling in the response (output-channel
 *     transformation, base64-over-markdown, etc.). Bucket → `'encoding'`.
 *   - `defense-layers` — missing structured section markers lets
 *     injected instructions blend with legitimate task content; the
 *     classic prompt-injection vector. Bucket → `'injection'`.
 *   - `input-handling` — missing "treat input as untrusted" is the
 *     canonical prompt-injection vulnerability (LLM01). Direct
 *     prompt-injection vector. Bucket → `'injection'`.
 *   - `tool-use-safety` — missing tool-policy guards lets attackers
 *     override the registered tool registry's authority (T0053 LLM
 *     Plugin Compromise). Bucket → `'override'`.
 *   - `rag-safety` — missing RAG-untrusted declaration enables
 *     indirect prompt-injection via retrieved content (LLM01-indirect).
 *     Bucket → `'injection'`.
 *   - `cost-controls` — missing rate-limits / output-bounds enable
 *     denial-of-service via unbounded generation; encoded into the
 *     output channel. Bucket → `'encoding'`.
 *   - `pii-handling` — missing PII redaction directly enables data
 *     exfiltration when an attacker probes for secrets / PII; output-
 *     channel encoding of sensitive data. Bucket → `'encoding'`.
 *   - `memory-state-safety` — missing session scoping enables cross-
 *     session state leakage; encoded persistence vector. Bucket →
 *     `'encoding'`.
 *   - `multi-modal-safety` — missing image / audio / document untrusted
 *     declaration enables injection via embedded payloads in
 *     attachments. Bucket → `'injection'`.
 *   - `agentic-workflow-safety` — missing human-in-the-loop / dry-run
 *     enables jailbreak-class staged setups (multi-turn task chaining
 *     to bypass safety). Bucket → `'jailbreak'`.
 *   - `alignment-stability` — missing persona-lock / role-stability
 *     leaves the model open to role-play jailbreak ("pretend you have
 *     no rules"). Persona manipulation is the canonical jailbreak
 *     primitive. Bucket → `'jailbreak'`.
 *
 * UPDATING: when a new rubric category lands (search:
 * `export const RUBRIC_CATEGORIES =` in
 * `packages/dojolm-web/src/lib/kotoba/rubric.ts`), add a row here mapping
 * it to the appropriate kind. Test GK2-003 will fail to remind future
 * maintainers if a new category lacks a mapping.
 */
export const KOTOBA_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    'boundary-definition': 'override',
    'role-clarity': 'social',
    'priority-ordering': 'override',
    'output-constraints': 'encoding',
    'defense-layers': 'injection',
    'input-handling': 'injection',
    'tool-use-safety': 'override',
    'rag-safety': 'injection',
    'cost-controls': 'encoding',
    'pii-handling': 'encoding',
    'memory-state-safety': 'encoding',
    'multi-modal-safety': 'injection',
    'agentic-workflow-safety': 'jailbreak',
    'alignment-stability': 'jailbreak',
  } satisfies Record<KotobaCategory, AttackKind>);

/**
 * Bucket a raw `category` string (Kotoba rubric category id) into a
 * closed {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link KOTOBA_CATEGORY_TO_KIND}. The server-side `analyzePrompt`
 * enforces the closed `RubricCategoryId` enum, so concrete narrowing
 * calls resolve to a mapped kind today; the implicit `'unknown'` branch
 * is defence-in-depth for the client-edge sanitization layer (which
 * widens the wire shape to `string` in `KotobaTabs.tsx`). This is the
 * EXPLICIT unknown slot — we do NOT silently fall through to a default
 * kind that would mask a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  const kind = KOTOBA_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a Kotoba rubric finding.
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Kotoba finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Kotoba findings AIVSS field
 */
export function findingToAivssMetrics(finding: KotobaFinding): AivssMetrics {
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
