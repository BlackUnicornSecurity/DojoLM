// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei agentic-validation / governance-review finding → AIVSS metrics
 * mapping.
 *
 * Phase G.3 / TICKET-G3-SENSEI — V1→V2 Restoration program (seventh G.3
 * surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Sensei chat tool-result
 * surface (the `renderScanResult` per-finding rows beneath the verdict
 * banner).
 *
 * Sensei "findings" surface = the scan/governance findings rendered inside
 * the Sensei chat assistant when a `scan_text` / `scan_format` /
 * `run_rag_pipeline_test` tool dispatch returns a verdict + findings list.
 * Sensei is the agentic-validation / governance-review surface; the
 * canonical 8-value closed-enum category taxonomy emitted by the
 * `/api/sensei/generate` endpoint (see `VALID_CATEGORIES` in
 * `packages/dojolm-web/src/app/api/sensei/generate/route.ts`):
 *
 *   - `prompt-injection`
 *   - `jailbreak`
 *   - `data-extraction`
 *   - `hallucination`
 *   - `toxicity`
 *   - `bias`
 *   - `pii-leak`
 *   - `system-prompt-leak`
 *
 * paired with the closed 3-value `'INFO' | 'WARNING' | 'CRITICAL'` severity
 * enum (shared with the v1 scanner pipeline `Severity`).
 *
 * Mapping strategy:
 *   - finding.category (closed 8-value `SenseiCategory` enum at the server
 *     edge; widened to `string` at the client edge for defence-in-depth)
 *     is bucketed into the closed {@link AttackKind} taxonomy via
 *     {@link SENSEI_CATEGORY_TO_KIND}. The mapping is exhaustive across
 *     every emitted Sensei category. Values outside the closed table
 *     fall through to the EXPLICIT `'unknown'` kind (defence-in-depth for
 *     the client-edge sanitization layer; NOT a silent default — mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench sister
 *     modules).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench mappings
 *     verbatim for cross-domain consistency).
 *   - finding.severity (closed 3-value `SenseiSeverity` enum: same
 *     `'INFO' | 'WARNING' | 'CRITICAL'` shape as the v1 scanner — see
 *     `packages/bu-tpi/src/types.ts` `Severity`) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (CRITICAL → high,
 *         WARNING → medium, INFO → low — mirrors the scanner /
 *         Workbench 3-value mappings verbatim).
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (CRITICAL → high, WARNING → low, INFO → none — mirrors the
 *         scanner / Workbench 3-value mappings verbatim).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Sensei chat tool-results
 *     originate from `scan_text` / `scan_format` / `run_rag_pipeline_test`
 *     dispatches against network-reachable LLM deployments and prompt
 *     inputs; adjacency / local / physical surface-area is not
 *     representable on this surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Sensei runs in the
 *     production-admin chat with full tool dispatch; tier-2/3 calibration
 *     is a follow-up when a per-engagement run-context selector plumbs
 *     through).
 *   - dataSensitivity defaults to 'internal' (admin Sensei surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on the various Sensei-dispatched scan responses
 * is a separate follow-up (TICKET-G3-API). This file is the CLIENT-SIDE
 * derivation only, mirroring the G-3-SCANNER + G-3-MITSUKE + G-3-ATEMI +
 * G-3-KAGAMI + G-3-BUKI + G-3-WORKBENCH pattern.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Per-finding AIVSS field
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/mitsuke/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/atemi/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/kagami/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/buki/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/lib/workbench/aivss-mapping.ts — sister module
 * @see packages/dojolm-web/src/app/api/sensei/generate/route.ts — VALID_CATEGORIES source
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
 * Closed 3-value Sensei severity enum. Mirrors the v1 scanner `Severity`
 * triple (`packages/bu-tpi/src/types.ts`); the Sensei tool-result surface
 * renders the same `INFO | WARNING | CRITICAL` shape so we re-declare it
 * locally (rather than importing) to keep the mapping module pure /
 * unit-testable in isolation.
 *
 * Mirrors the `ScanFindingSeverity` (scanner) / `WorkbenchSeverity`
 * declarations in the sister modules verbatim.
 */
export type SenseiSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Closed 8-value Sensei category enum, sourced from `VALID_CATEGORIES`
 * in `packages/dojolm-web/src/app/api/sensei/generate/route.ts`. The
 * `/api/sensei/generate` route enforces this closed enum at the server
 * edge; the client-edge sanitization layer widens to `string` for
 * defence-in-depth (mirrors the scanner / Mitsuke / Atemi / Kagami /
 * Buki / Workbench widening pattern).
 *
 * Re-declared here as a local type union (not imported as
 * `Pick<...VALID_CATEGORIES...>`) to keep the mapping module pure /
 * unit-testable in isolation. New categories that ship in
 * `VALID_CATEGORIES` without a row in {@link SENSEI_CATEGORY_TO_KIND}
 * will trip GS-003 (the exhaustiveness test) until folded into the map.
 */
export type SenseiCategory =
  | 'prompt-injection'
  | 'jailbreak'
  | 'data-extraction'
  | 'hallucination'
  | 'toxicity'
  | 'bias'
  | 'pii-leak'
  | 'system-prompt-leak';

/**
 * Local Finding shape used by the Sensei chat tool-result surface.
 * Mirrors the narrowed subset of the wire-shape rendered by
 * `renderScanResult` in `SenseiToolResult.tsx` — `category` + `severity`
 * are the sufficient inputs for the AIVSS mapping.
 *
 * Re-declared here (not imported as a `Pick<...>`) to keep this mapping
 * module pure / unit-testable in isolation, mirroring the `ScanFinding` +
 * `MitsukeFinding` + `AtemiFinding` + `KagamiFinding` + `BukiFinding` +
 * `WorkbenchFinding` declarations in the sister modules.
 *
 * `category` is typed as `string` (not the closed `SenseiCategory`
 * literal union) so the mapper accepts the widened client-edge shape.
 * The closed enum is enforced server-side via the `VALID_CATEGORIES`
 * gate; `'unknown'` is the explicit fallback for any value that bypasses
 * the server-side gate (defence-in-depth for the client-edge
 * sanitization layer).
 */
export interface SenseiFinding {
  readonly category: string;
  readonly severity: SenseiSeverity;
}

/**
 * Closed taxonomy of Sensei-attack kinds — bucketing layer between the
 * 8-value `SenseiCategory` enum and the 2-state AivssAttackComplexity
 * enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami + Buki + Workbench sister modules so cross-domain
 * consumers can later share a hoisted map. Per-domain divergence today:
 * every Sensei category slots cleanly into one of the 5 named kinds; the
 * 8-value enum is narrower than the ~67-pattern scanner enum and
 * narrower than the 19-value Workbench / 20-value Buki enums.
 *
 * `'unknown'` is the EXPLICIT slot for a `category` string that bypasses
 * the server-side closed-enum gate (defence-in-depth for the
 * client-edge sanitization layer) — NOT a silent default.
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
 * Atemi / Kagami / Buki / Workbench versions verbatim — kept duplicated
 * rather than hoisted because per-domain divergence on the input side is
 * large enough that a hoist would couple the seven domains' input enums).
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
 * Severity → AivssPis (Prompt Injection Success rate) for Sensei
 * findings. The 3-value `SenseiSeverity` enum maps directly to the
 * 3-value `AivssPis` enum (mirrors the scanner / Workbench 3-value
 * mappings verbatim):
 *
 * - CRITICAL → `'high'` (>50% success — high-confidence governance
 *   violation with active exploit signal)
 * - WARNING → `'medium'` (10–50% — calibrated mid-band)
 * - INFO → `'low'` (<10% — recon / reference / observed-only)
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<SenseiSeverity, AivssPis>> =
  Object.freeze({
    INFO: 'low',
    WARNING: 'medium',
    CRITICAL: 'high',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - CRITICAL → `'high'` (full / large compromise of the dimension)
 * - WARNING → `'low'` (partial / bounded compromise)
 * - INFO → `'none'` (no impact, recon / reference only)
 *
 * Mirrors the scanner / Workbench 3-value mappings verbatim.
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<SenseiSeverity, AivssImpact>> =
  Object.freeze({
    INFO: 'none',
    WARNING: 'low',
    CRITICAL: 'high',
  });

/**
 * Default attack vector. Sensei chat tool-results originate from
 * `scan_text` / `scan_format` / `run_rag_pipeline_test` dispatches
 * against network-reachable LLM deployments and prompt inputs;
 * adjacent / local / physical surface-area is not representable on
 * this surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Sensei is the production-admin
 * agentic chat with full tool dispatch; this is the worst-case default.
 * Tier-2/3 calibration arrives when a run-context selector is plumbed
 * through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Sensei runs against in-flight prompts
 * + tool-results which by default are 'internal'-classified.
 * Per-engagement override is a follow-up when DSR classification plumbs
 * through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every Sensei category emitted by
 * `/api/sensei/generate` (the `VALID_CATEGORIES` set) to its
 * {@link AttackKind} bucket. Test GS-003 verifies the table is
 * exhaustive against every member of the `SenseiCategory` closed
 * union (sourced from
 * `packages/dojolm-web/src/app/api/sensei/generate/route.ts`).
 *
 * Bucketing rationale (each category → kind):
 *   - `prompt-injection` — direct prompt-instruction injection. The
 *     injection class by definition. Bucket → `'injection'`.
 *   - `jailbreak` — multi-turn / framing-based safety bypass. Typical
 *     jailbreak attacks need staged setup. Bucket → `'jailbreak'`.
 *   - `data-extraction` — context / training-data / private-doc
 *     extraction. Direct embedding into the prompt + parse-out style
 *     attack. Bucket → `'injection'`.
 *   - `hallucination` — model produces fabricated factual claims.
 *     Single-shot governance violation at the output boundary; not an
 *     authority flip but a constraint failure of the truthfulness
 *     guarantee. Bucket → `'override'`.
 *   - `toxicity` — single-shot social-vector output (slurs / abuse /
 *     harassment). Pretext at the response layer. Bucket → `'social'`.
 *   - `bias` — single-shot social-vector output (discriminatory
 *     stereotyping). Pretext at the response layer. Bucket →
 *     `'social'`.
 *   - `pii-leak` — PII enumeration / training-data extraction. Direct
 *     embedding into the response + parse-out style attack. Bucket →
 *     `'injection'`.
 *   - `system-prompt-leak` — system-prompt extraction / override.
 *     Authority flip at the system-prompt boundary. Bucket →
 *     `'override'`.
 *
 * UPDATING: when a new Sensei category lands (search:
 * `VALID_CATEGORIES = new Set([` in
 * `packages/dojolm-web/src/app/api/sensei/generate/route.ts`), add a
 * row here mapping it to the appropriate kind. Test GS-003 will fail
 * to remind future maintainers if a new category lacks a mapping.
 */
export const SENSEI_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    'prompt-injection': 'injection',
    jailbreak: 'jailbreak',
    'data-extraction': 'injection',
    hallucination: 'override',
    toxicity: 'social',
    bias: 'social',
    'pii-leak': 'injection',
    'system-prompt-leak': 'override',
  } satisfies Record<SenseiCategory, AttackKind>);

/**
 * Bucket a raw `category` string into a closed {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link SENSEI_CATEGORY_TO_KIND}. The server-side
 * `/api/sensei/generate` route enforces the closed `SenseiCategory`
 * enum, so concrete narrowing calls resolve to a non-`'unknown'` kind
 * today; the `'unknown'` branch is defence-in-depth for the
 * client-edge sanitization layer (which widens the wire shape to
 * `string`). This is the EXPLICIT unknown slot — we do NOT silently
 * fall through to a default kind that would mask a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  const kind = SENSEI_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a Sensei finding (chat tool-result
 * row).
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Sensei finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Sensei findings AIVSS field
 */
export function findingToAivssMetrics(finding: SenseiFinding): AivssMetrics {
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
