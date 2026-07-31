// SPDX-License-Identifier: Apache-2.0
/**
 * Ronin community bug-bounty submission finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-RONIN — V1→V2 Restoration program (eighth G.3
 * surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Ronin submission queue
 * (the bug-bounty submission rows in the Submissions tab of
 * `RoninAdminClient.tsx`).
 *
 * Ronin "findings" surface = the bug-bounty submission queue rendered as
 * `AttackRow` items beneath the KPI tiles. Each submission carries a
 * `SubmissionStatus` (closed 6-value lifecycle enum) + `SubmissionSeverity`
 * (closed 5-value criticality enum). The `/api/ronin/submissions` route
 * serves the closed-enum shape; the client-side `sanitizeSubmission`
 * widens to `string` for defence-in-depth, so this mapper accepts a wide
 * `string` for `category` (the lifecycle stage) and falls through to the
 * EXPLICIT `'unknown'` kind for any value outside the closed table
 * (mirrors the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench /
 * Sensei sister modules).
 *
 * Ronin domain note — Ronin submissions are community red-team
 * contributions to bug-bounty programs. Unlike scanner / Buki / Sensei
 * findings (which carry an explicit attack-category label), a Ronin
 * submission's wire shape does NOT carry an attack-class field; the
 * closest closed enum that ships today is the `SubmissionStatus`
 * lifecycle bucket. We use that as the bucketing input. The bucketing
 * rationale is: bug-bounty submissions that have progressed past
 * `'draft'` have been classified by a triager as a real attack chain,
 * so they bucket as `'injection'` (the default working hypothesis for
 * bug-bounty findings — most submitted bug-bounty exploits are
 * injection-class against an LLM gateway). `'draft'` (no signal yet)
 * and `'rejected'` (no real attack) bucket to `'unknown'`. When a
 * future schema lands an explicit `attackClass` field on submissions
 * (TICKET-G3-RONIN-FOLLOWUP), the bucketing input migrates to that
 * field and this lifecycle-based fallback retires.
 *
 * Mapping strategy:
 *   - finding.category (wide string at the client edge; closed
 *     `SubmissionStatus` 6-value enum at the server edge) is bucketed
 *     into the closed {@link AttackKind} taxonomy via
 *     {@link RONIN_CATEGORY_TO_KIND}. The mapping is exhaustive across
 *     every `SubmissionStatus` value; values outside the closed enum
 *     fall through to the EXPLICIT `'unknown'` kind (NOT a silent
 *     default).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench / Sensei
 *     mappings verbatim for cross-domain consistency).
 *   - finding.severity (closed 5-value `SubmissionSeverity` enum,
 *     lowercase: `'critical' | 'high' | 'medium' | 'low' | 'info'`)
 *     drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (critical/high → high,
 *         medium → medium, low/info → low — mirrors Mitsuke + Atemi +
 *         Kagami + Buki + Workbench 5-value mappings)
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (critical/high → high, medium → low, low/info → none —
 *         mirrors the sister 5-value mappings).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Ronin submissions target
 *     network-reachable LLM deployments — the bug-bounty programs
 *     surfaced via HackerOne / Bugcrowd / huntr / 0din are all
 *     network-reachable LLM gateways; adjacency / local / physical
 *     surface-area is not representable on the submission-queue
 *     surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Ronin runs against
 *     production-payload posture; tier-2/3 calibration is a follow-up
 *     when a per-engagement run-context selector plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Ronin surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/ronin/submissions` response is a
 * separate follow-up (TICKET-G3-API). This file is the CLIENT-SIDE
 * derivation only, mirroring the G-3-SCANNER + G-3-MITSUKE + G-3-ATEMI
 * + G-3-KAGAMI + G-3-BUKI + G-3-WORKBENCH + G-3-SENSEI pattern.
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
 * @see packages/dojolm-web/src/app/(shell)/admin/ronin/RoninAdminClient.tsx — SubmissionStatus / SubmissionSeverity source
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
 * Closed 5-value Ronin submission severity enum, lowercase. Mirrors
 * `SubmissionSeverity` declared in
 * `packages/dojolm-web/src/app/(shell)/admin/ronin/RoninAdminClient.tsx`.
 *
 * Re-declared here (not imported) to keep this mapping module pure /
 * unit-testable in isolation, mirroring the `ScanFinding` + `MitsukeFinding`
 * + `AtemiFinding` + `KagamiFinding` + `BukiFinding` + `WorkbenchFinding`
 * + `SenseiFinding` declarations in the sister modules. The host client
 * narrows wire data through `isSubmissionSeverity` before passing it to
 * the row component, so this re-declaration stays in sync via the
 * `satisfies` clause on {@link RONIN_CATEGORY_TO_KIND} and the
 * exhaustiveness test in `aivss-mapping.test.ts`.
 */
export type RoninSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

/**
 * Canonical readonly array of every {@link RoninSeverity} value.
 *
 * Hardcoded literal (NOT derived from `Object.keys(SEVERITY_TO_PIS)`) so
 * that:
 *   - a hostile module-pollution scenario can't extend the allow-list at
 *     module init via `Object.defineProperty(SEVERITY_TO_PIS, ...)`.
 *   - the type union and the runtime allow-list stay in lock-step at
 *     compile time — if a new severity is added to the union, the
 *     `satisfies` check at the end of this file (via the
 *     `SEVERITY_TO_PIS` Record-keyed exhaustiveness) trips first.
 *
 * Mirrors `JUTSU_SEVERITIES` in the sister mapping module verbatim
 * (modulo the lowercase convention).
 */
export const RONIN_SEVERITIES: readonly RoninSeverity[] = Object.freeze([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

/**
 * Closed 6-value Ronin submission lifecycle enum, lowercase. Mirrors
 * `SubmissionStatus` declared in `RoninAdminClient.tsx`. Used as the
 * bucketing input in lieu of an explicit attack-class field on the
 * submission wire shape (see module-doc rationale).
 *
 * Re-declared here as a local type union (not imported) to keep the
 * mapping module pure / unit-testable in isolation. New statuses that
 * ship in the host client without a row in
 * {@link RONIN_CATEGORY_TO_KIND} will trip GR-003 (the exhaustiveness
 * test) until folded into the map.
 */
export type RoninCategory =
  | 'draft'
  | 'submitted'
  | 'triaged'
  | 'validated'
  | 'paid'
  | 'rejected';

/**
 * Local Finding shape used by the Ronin submission queue surface.
 * Mirrors the narrowed subset of the `SubmissionLite` declared in
 * `RoninAdminClient.tsx` (sanitized at fetch in `sanitizeSubmission`)
 * that the AIVSS mapping consumes — `category` (lifecycle status) +
 * `severity` are the sufficient inputs.
 *
 * Re-declared here (not imported as `Pick<SubmissionLite, ...>`) to
 * keep this mapping module pure / unit-testable in isolation, mirroring
 * the `ScanFinding` + `MitsukeFinding` + `AtemiFinding` + `KagamiFinding`
 * + `BukiFinding` + `WorkbenchFinding` + `SenseiFinding` declarations
 * in the sister modules.
 *
 * `category` is typed as `string` (not the closed `RoninCategory`
 * literal union) so the mapper accepts the widened client-edge shape.
 * The closed enum is enforced server-side via the route's
 * `isSubmissionStatus` gate; `'unknown'` is the explicit fallback for
 * any value that bypasses the server-side gate (defence-in-depth for
 * the client-edge sanitization layer).
 */
export interface RoninFinding {
  readonly category: string;
  readonly severity: RoninSeverity;
}

/**
 * Closed taxonomy of Ronin-attack kinds — bucketing layer between the
 * 6-value `RoninCategory` (lifecycle) enum and the 2-state
 * AivssAttackComplexity enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami + Buki + Workbench + Sensei sister modules so
 * cross-domain consumers can later share a hoisted map. Per-domain
 * divergence today: every Ronin lifecycle bucket slots cleanly into
 * `'injection'` (default working hypothesis for bug-bounty findings)
 * or `'unknown'` (no signal / rejected).
 *
 * `'unknown'` is the EXPLICIT slot for a `category` string that
 * bypasses the server-side closed-enum gate (defence-in-depth for the
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
 * Atemi / Kagami / Buki / Workbench / Sensei versions verbatim — kept
 * duplicated rather than hoisted because per-domain divergence on the
 * input side is large enough that a hoist would couple the eight
 * domains' input enums).
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
 * Severity → AivssPis (Prompt Injection Success rate) for Ronin
 * submissions. The 5-value `RoninSeverity` enum (lowercase) maps to
 * the 3-value `AivssPis` enum (mirrors the Mitsuke + Atemi + Kagami +
 * Buki + Workbench 5-value mappings verbatim, modulo the lowercase
 * convention):
 *
 * - critical / high → `'high'` (>50% success — high-confidence
 *   exploit chain with active payout signal)
 * - medium → `'medium'` (10–50% — calibrated mid-band)
 * - low / info → `'low'` (<10% — recon / reference / observed-only)
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<RoninSeverity, AivssPis>> =
  Object.freeze({
    critical: 'high',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'low',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - critical / high → `'high'` (full / large compromise of the dimension)
 * - medium → `'low'` (partial / bounded compromise)
 * - low / info → `'none'` (no impact, recon / reference only)
 *
 * Mirrors the Mitsuke + Atemi + Kagami + Buki + Workbench 5-value
 * mappings verbatim, modulo the lowercase convention.
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<RoninSeverity, AivssImpact>> =
  Object.freeze({
    critical: 'high',
    high: 'high',
    medium: 'low',
    low: 'none',
    info: 'none',
  });

/**
 * Default attack vector. Ronin bug-bounty submissions target
 * network-reachable LLM deployments via HackerOne / Bugcrowd / huntr /
 * 0din programs; adjacency / local / physical surface-area is not
 * representable on the submission queue surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Ronin is the production-admin
 * bug-bounty hub; this is the worst-case default. Tier-2/3 calibration
 * arrives when a run-context selector is plumbed through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Ronin runs against in-flight
 * submission payloads which by default are 'internal'-classified.
 * Per-engagement override is a follow-up when DSR classification
 * plumbs through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every Ronin lifecycle status emitted by
 * `/api/ronin/submissions` (the `isSubmissionStatus` set) to its
 * {@link AttackKind} bucket. Test GR-003 verifies the table is
 * exhaustive against every member of the `RoninCategory` closed
 * union (sourced from `RoninAdminClient.tsx`).
 *
 * Bucketing rationale (each lifecycle status → kind):
 *   - `draft` — submission in progress, no triager classification yet.
 *     No attack-kind signal. Bucket → `'unknown'`.
 *   - `submitted` — submission filed, awaiting triage. Default working
 *     hypothesis: bug-bounty submissions against LLM gateways are
 *     injection-class (the dominant category in the bounty corpus).
 *     Bucket → `'injection'`.
 *   - `triaged` — triager has accepted as a real attack chain. Same
 *     baseline (injection-class default). Bucket → `'injection'`.
 *   - `validated` — bounty owner has confirmed reproducibility. Same
 *     baseline. Bucket → `'injection'`.
 *   - `paid` — bounty paid out, finding closed. Same baseline. Bucket
 *     → `'injection'`.
 *   - `rejected` — submission rejected (out-of-scope, duplicate,
 *     non-issue). No real attack chain. Bucket → `'unknown'`.
 *
 * UPDATING: when a new submission status lands (search:
 * `type SubmissionStatus = ` in
 * `packages/dojolm-web/src/app/(shell)/admin/ronin/RoninAdminClient.tsx`
 * and `isSubmissionStatus` in the same file), add a row here mapping
 * it to the appropriate kind. Test GR-003 will fail to remind future
 * maintainers if a new status lacks a mapping.
 *
 * FUTURE WORK: when the submission wire shape lands an explicit
 * `attackClass` field (TICKET-G3-RONIN-FOLLOWUP), migrate the
 * bucketing input to that field and retire this lifecycle-based
 * fallback. The lifecycle-based bucketing is a defensible default
 * given Ronin's current shape but is not a substitute for a real
 * attack-class label.
 */
export const RONIN_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    draft: 'unknown',
    submitted: 'injection',
    triaged: 'injection',
    validated: 'injection',
    paid: 'injection',
    rejected: 'unknown',
  } satisfies Record<RoninCategory, AttackKind>);

/**
 * Bucket a raw `category` string (Ronin lifecycle status) into a
 * closed {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link RONIN_CATEGORY_TO_KIND}. The server-side
 * `/api/ronin/submissions` route enforces the closed `RoninCategory`
 * (status) enum, so concrete narrowing calls resolve to a mapped kind
 * today; the implicit `'unknown'` branch is defence-in-depth for the
 * client-edge sanitization layer (which widens the wire shape to
 * `string`). This is the EXPLICIT unknown slot — we do NOT silently
 * fall through to a default kind that would mask a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  // Adversarial-review HIGH-1 fix — mirror the Jutsu sister module's
  // `Object.hasOwn` guard. Without this, a `category` value of
  // `'__proto__'` / `'constructor'` / `'toString'` would resolve to a
  // prototype-chain object (not `undefined`), bypassing the `??`
  // fallback and producing an invalid `AttackKind` that breaks
  // downstream `KIND_TO_AC` lookup.
  if (!Object.hasOwn(RONIN_CATEGORY_TO_KIND, category)) return 'unknown';
  const kind = RONIN_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a Ronin submission finding.
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Ronin finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Ronin submissions AIVSS field
 */
export function findingToAivssMetrics(finding: RoninFinding): AivssMetrics {
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
