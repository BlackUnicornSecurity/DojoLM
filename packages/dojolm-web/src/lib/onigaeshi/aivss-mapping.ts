// SPDX-License-Identifier: Apache-2.0
/**
 * Onigaeshi WORM audit-record finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-ONIGAESHI — V1→V2 Restoration program (eleventh
 * G.3 surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Onigaeshi audit-log surface
 * (the audit-row entries rendered by `AuditLogPanel` in
 * `packages/dojolm-web/src/app/(shell)/admin/onigaeshi/page.tsx`).
 *
 * Onigaeshi "findings" surface = the WORM audit log + per-engagement
 * lifecycle audit rows. Each row carries a closed-enum `OnigaeshiAuditType`
 * (9-value: invocation.{attempted,blocked,completed} +
 * engagement.{created,activated,revoked} + killswitch.honored +
 * sanitize.blocked + dsr.erasure) and a 3-value `outcome` (allowed |
 * blocked | n/a). The `bu-tpi/onigaeshi/audit.ts` module is the canonical
 * source; this client-side mapper re-declares the closed enums (NOT
 * imported) so the mapping module stays pure / unit-testable in isolation,
 * mirroring the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench /
 * Sensei / Ronin / Amaterasu / Kotoba sister modules.
 *
 * Onigaeshi domain note — Onigaeshi audit records are pure WORM
 * observability events, NOT attack-class signals. Unlike scanner / Buki /
 * Sensei findings (which carry an explicit attack-category label), an
 * Onigaeshi audit row's wire shape does NOT carry an attack-class field;
 * the closed enums available (`type` / `outcome`) describe lifecycle
 * stage + admit/deny disposition rather than the underlying attack
 * technique. Mapping these to `AttackKind` would be a domain misfit
 * because:
 *   - `engagement.created` describes a registry write, not a payload class.
 *   - `killswitch.honored` describes a kill-signal acknowledgement, not
 *     the prior payload that triggered it.
 *   - `sanitize.blocked` describes a defence-driver verdict but the
 *     specific driver (Azure Content Safety / HuggingFace / Ollama) and
 *     payload class are not exposed on the audit row.
 *   - `dsr.erasure` describes a DSR cascade marker, not an attack.
 *
 * Therefore — applying the RONIN lesson (reviewer flagged that
 * `SubmissionStatus` lifecycle was a domain misfit for attack-class
 * derivation) — this mapper SUPPRESSES client-side derivation: the host
 * client renders `<AivssPill band='none'>` until TICKET-G3-API-ONIGAESHI
 * ships a server-side `auditRecord.aivss` field. The mapper machinery
 * remains in place so the cross-G3-surface harness (GO-001..GO-006)
 * stays consistent with the other 10 surfaces, and so that once the
 * server schema lands the wire-passthrough path ({@link findingToAivssMetrics})
 * has identical structure to the sister modules. Until then, the host
 * client does NOT call `findingToAivssMetrics` on an audit row — it
 * passes through `auditRow.aivss ?? null` and renders `band='none'` on
 * null.
 *
 * Mapping strategy (preserved for the future server-side AIVSS field
 * flow + for harness symmetry; NOT invoked client-side today):
 *   - finding.category (wide string at the client edge; closed
 *     `OnigaeshiAuditType` 9-value enum at the server edge) is bucketed
 *     into the closed {@link AttackKind} taxonomy via
 *     {@link ONIGAESHI_CATEGORY_TO_KIND}. The mapping is exhaustive
 *     across every `OnigaeshiAuditType` value; values outside the closed
 *     enum fall through to the EXPLICIT `'unknown'` kind (NOT a silent
 *     default).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench / Sensei
 *     / Ronin / Amaterasu / Kotoba mappings verbatim for cross-domain
 *     consistency).
 *   - finding.outcome (closed 3-value `OnigaeshiAuditOutcome` enum,
 *     lowercase: `'allowed' | 'blocked' | 'n/a'`) drives:
 *       - PIS rate via {@link OUTCOME_TO_PIS} (allowed → high — the
 *         attack succeeded; blocked → low — the attack was stopped; n/a
 *         → low — no payload exchange).
 *       - 3-impact triple uniformly via {@link OUTCOME_TO_IMPACT}
 *         (allowed → high; blocked → none; n/a → none).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Onigaeshi engagements target
 *     network-reachable LLM deployments — every supported defence
 *     driver — Azure Content Safety / HuggingFace / Ollama — is
 *     network-reachable; adjacency / local / physical surface-area is
 *     not representable on the audit-row surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Onigaeshi runs
 *     against production-payload posture; tier-2/3 calibration is a
 *     follow-up when a per-engagement run-context selector plumbs
 *     through).
 *   - dataSensitivity defaults to 'internal' (admin Onigaeshi surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/admin/onigaeshi/audit` response is a
 * separate follow-up (TICKET-G3-API-ONIGAESHI). This file is the
 * CLIENT-SIDE derivation only (intentionally suppressed at the host),
 * mirroring the G-3-SCANNER + G-3-MITSUKE + G-3-ATEMI + G-3-KAGAMI +
 * G-3-BUKI + G-3-WORKBENCH + G-3-SENSEI + G-3-RONIN + G-3-AMATERASU +
 * G-3-KOTOBA pattern.
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
 * @see packages/bu-tpi/src/onigaeshi/audit.ts — OnigaeshiAuditType / outcome source
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
 * Closed 3-value Onigaeshi audit outcome enum, lowercase. Mirrors the
 * `outcome` field declared on `OnigaeshiAuditEntry` in
 * `packages/bu-tpi/src/onigaeshi/audit.ts`.
 *
 * Re-declared here (not imported) to keep this mapping module pure /
 * unit-testable in isolation, mirroring the `RoninSeverity` declaration
 * in the Ronin sister. The host client narrows wire data via the
 * `AuditRow` interface in `page.tsx`, so this re-declaration stays in
 * sync via the `satisfies` clauses on {@link OUTCOME_TO_PIS} +
 * {@link OUTCOME_TO_IMPACT} and the exhaustiveness test in
 * `aivss-mapping.test.ts` (GO-003).
 *
 * Note on naming: this is `OnigaeshiSeverity` for symmetry with the 10
 * sister modules' naming convention (`<Surface>Severity`), even though
 * the Onigaeshi wire-shape calls the field `outcome`. The values are
 * lifecycle-disposition states, not severity bands; the rename to
 * `Severity` is purely for cross-module API symmetry.
 */
export type OnigaeshiSeverity =
  | 'allowed'
  | 'blocked'
  | 'n/a';

/**
 * Closed 9-value Onigaeshi audit type enum, lowercase. Mirrors
 * `OnigaeshiAuditType` declared in
 * `packages/bu-tpi/src/onigaeshi/audit.ts`. Used as the bucketing input
 * in lieu of an explicit attack-class field on the audit-row wire shape
 * (see module-doc rationale).
 *
 * Re-declared here as a local type union (not imported) to keep the
 * mapping module pure / unit-testable in isolation. New audit types
 * that ship in the host enum without a row in
 * {@link ONIGAESHI_CATEGORY_TO_KIND} will trip GO-003 (the
 * exhaustiveness test) until folded into the map.
 */
export type OnigaeshiCategory =
  | 'invocation.attempted'
  | 'invocation.blocked'
  | 'invocation.completed'
  | 'engagement.created'
  | 'engagement.activated'
  | 'engagement.revoked'
  | 'killswitch.honored'
  | 'sanitize.blocked'
  | 'dsr.erasure';

/**
 * Local Finding shape used by the Onigaeshi audit-log surface.
 * Mirrors the narrowed subset of the `AuditRow` declared in
 * `page.tsx` (sanitized at fetch via the route's `OnigaeshiAuditType` +
 * outcome enum gates) that the AIVSS mapping consumes — `category` (audit
 * type) + `severity` (outcome) are the sufficient inputs.
 *
 * Re-declared here (not imported as `Pick<AuditRow, ...>`) to keep this
 * mapping module pure / unit-testable in isolation, mirroring the
 * `RoninFinding` declaration in the Ronin sister.
 *
 * `category` is typed as `string` (not the closed `OnigaeshiCategory`
 * literal union) so the mapper accepts the widened client-edge shape.
 * The closed enum is enforced server-side via the route's
 * `isOnigaeshiAuditType` gate; `'unknown'` is the explicit fallback for
 * any value that bypasses the server-side gate (defence-in-depth for
 * the client-edge sanitization layer).
 */
export interface OnigaeshiFinding {
  readonly category: string;
  readonly severity: OnigaeshiSeverity;
}

/**
 * Closed taxonomy of Onigaeshi-attack kinds — bucketing layer between
 * the 9-value `OnigaeshiCategory` (audit type) enum and the 2-state
 * AivssAttackComplexity enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami + Buki + Workbench + Sensei + Ronin + Amaterasu +
 * Kotoba sister modules so cross-domain consumers can later share a
 * hoisted map. Per-domain divergence today: every Onigaeshi audit type
 * slots either to `'injection'` (the dominant working hypothesis when
 * a payload-class signal is absent — the only attack types Onigaeshi's
 * defence drivers can intercept on a guarded-mode invocation are
 * prompt-injection / jailbreak / sanitize-fail) or `'unknown'` (no
 * payload-class signal at all — engagement lifecycle / DSR markers).
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
 * AttackKind → AivssAttackComplexity mapping (mirrors scanner / Mitsuke
 * / Atemi / Kagami / Buki / Workbench / Sensei / Ronin / Amaterasu /
 * Kotoba versions verbatim — kept duplicated rather than hoisted because
 * per-domain divergence on the input side is large enough that a hoist
 * would couple the eleven domains' input enums).
 *
 * - `jailbreak` → `'high'` (typically requires multi-turn or staged setup)
 * - `encoding` / `injection` / `override` / `social` → `'low'` (single-shot)
 * - `unknown` → `'low'` (conservative — assume the easier case for an
 *   un-categorized finding so the AIVSS score does not understate severity).
 *
 * @see ADR-0097 §1 metric 2 — AC closed enum
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister table
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
 * Outcome → AivssPis (Prompt Injection Success rate) for Onigaeshi
 * audit rows. The 3-value `OnigaeshiSeverity` enum (lowercase) maps to
 * the 3-value `AivssPis` enum:
 *
 * - allowed → `'high'` (>50% success — the defence drivers admitted the
 *   payload, so the attack chain succeeded against the guarded model)
 * - blocked → `'low'` (<10% — the defence drivers refused the payload,
 *   so the attack chain was stopped at the gate)
 * - n/a → `'low'` (<10% — no payload exchange occurred, e.g. an
 *   engagement.created administrative event)
 *
 * Note: this preserves harness symmetry with the 5-value sister
 * mappings (which use `medium` for the boundary case) by collapsing
 * the 3-value Onigaeshi enum to the {high, low} subset of `AivssPis`.
 * The `'medium'` slot is unreachable for Onigaeshi today; if a future
 * partial-block outcome ships, this map will need a row addition + the
 * exhaustiveness test will trip until folded in.
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const OUTCOME_TO_PIS: Readonly<Record<OnigaeshiSeverity, AivssPis>> =
  Object.freeze({
    allowed: 'high',
    blocked: 'low',
    'n/a': 'low',
  });

/**
 * Outcome → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - allowed → `'high'` (full / large compromise: payload reached the
 *   guarded model)
 * - blocked → `'none'` (defence held; no compromise)
 * - n/a → `'none'` (no payload exchange; no compromise)
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const OUTCOME_TO_IMPACT: Readonly<Record<OnigaeshiSeverity, AivssImpact>> =
  Object.freeze({
    allowed: 'high',
    blocked: 'none',
    'n/a': 'none',
  });

/**
 * Default attack vector. Onigaeshi engagements target network-reachable
 * LLM deployments via the Azure Content Safety / HuggingFace / Ollama
 * defence drivers; every supported driver is network-reachable on the
 * audit-row surface today. Adjacency / local / physical surface-area
 * is not representable.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Onigaeshi is the production-admin
 * defence-validation hub; this is the worst-case default. Tier-2/3
 * calibration arrives when a run-context selector is plumbed through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Onigaeshi runs against in-flight
 * audit-record payloads which by default are 'internal'-classified.
 * Per-engagement override is a follow-up when DSR classification
 * plumbs through. (PII fields use the `pii_` prefix and are masked by
 * the WORM `audit-overlay.ts` module — see PR-E4 #134.)
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every Onigaeshi audit type emitted by
 * `OnigaeshiAuditType` (the 9-value closed enum in
 * `packages/bu-tpi/src/onigaeshi/audit.ts`) to its {@link AttackKind}
 * bucket. Test GO-003 verifies the table is exhaustive against every
 * member of the `OnigaeshiCategory` closed union.
 *
 * Bucketing rationale (each audit type → kind):
 *   - `invocation.attempted` — payload-class invocation submitted to a
 *     guarded model. Default working hypothesis: invocations against
 *     guarded LLM gateways are injection-class (the dominant category
 *     in the prompt-injection corpus that Onigaeshi defence drivers
 *     are designed to intercept). Bucket → `'injection'`.
 *   - `invocation.blocked` — same baseline payload class, just with the
 *     defence driver returning a block verdict. Same bucket →
 *     `'injection'`.
 *   - `invocation.completed` — same baseline payload class, just with
 *     the defence driver returning an allow verdict + the model
 *     completing. Same bucket → `'injection'`.
 *   - `engagement.created` — administrative registry write (engagement
 *     row inserted). No payload-class signal. Bucket → `'unknown'`.
 *   - `engagement.activated` — administrative state transition
 *     (engagement promoted to active). No payload-class signal.
 *     Bucket → `'unknown'`.
 *   - `engagement.revoked` — administrative state transition
 *     (engagement revoked). No payload-class signal. Bucket →
 *     `'unknown'`.
 *   - `killswitch.honored` — kill-signal acknowledgement audit. The
 *     prior payload that triggered the kill-switch is not exposed on
 *     the audit row; no payload-class signal. Bucket → `'unknown'`.
 *   - `sanitize.blocked` — pre-flight payload sanitizer rejected
 *     input. Defence-driver verdict on a payload that is by
 *     construction injection-class (sanitizer is the prompt-injection
 *     gate). Bucket → `'injection'`.
 *   - `dsr.erasure` — DSR cascade marker (PR-E4 #134, Path B). Not an
 *     attack; a data-subject right erasure marker. No payload-class
 *     signal. Bucket → `'unknown'`.
 *
 * UPDATING: when a new audit type lands (search:
 * `export type OnigaeshiAuditType =` in
 * `packages/bu-tpi/src/onigaeshi/audit.ts`), add a row here mapping
 * it to the appropriate kind. Test GO-003 will fail to remind future
 * maintainers if a new type lacks a mapping.
 *
 * FUTURE WORK: when the audit-row wire shape lands an explicit
 * `attackClass` field (TICKET-G3-API-ONIGAESHI), migrate the bucketing
 * input to that field and retire this audit-type-based fallback. The
 * audit-type-based bucketing is a defensible default given Onigaeshi's
 * current shape but is NOT a substitute for a real attack-class label,
 * which is precisely why the host client today SUPPRESSES client-side
 * derivation and renders `band='none'` on the audit-row chip (RONIN
 * lesson — see module-doc rationale).
 */
export const ONIGAESHI_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    'invocation.attempted': 'injection',
    'invocation.blocked': 'injection',
    'invocation.completed': 'injection',
    'engagement.created': 'unknown',
    'engagement.activated': 'unknown',
    'engagement.revoked': 'unknown',
    'killswitch.honored': 'unknown',
    'sanitize.blocked': 'injection',
    'dsr.erasure': 'unknown',
  } satisfies Record<OnigaeshiCategory, AttackKind>);

/**
 * Bucket a raw `category` string (Onigaeshi audit type) into a closed
 * {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link ONIGAESHI_CATEGORY_TO_KIND}. The server-side
 * `OnigaeshiAuditType` enum is enforced at the writer layer in
 * `audit.ts`, so concrete narrowing calls resolve to a mapped kind
 * today; the implicit `'unknown'` branch is defence-in-depth for the
 * client-edge sanitization layer (which widens the wire shape to
 * `string`). This is the EXPLICIT unknown slot — we do NOT silently
 * fall through to a default kind that would mask a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  const kind = ONIGAESHI_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from an Onigaeshi audit-row finding.
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * NOTE: this function is preserved for harness symmetry + for the
 * future server-side AIVSS field flow (TICKET-G3-API-ONIGAESHI). The
 * host client INTENTIONALLY does not invoke this on audit rows today
 * (RONIN-precedent suppression). When the server schema lands, the
 * `auditRow.aivss` wire passthrough takes over and chips populate
 * automatically with no additional client changes.
 *
 * @param finding — narrow Onigaeshi finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Onigaeshi audit-rows AIVSS field
 */
export function findingToAivssMetrics(finding: OnigaeshiFinding): AivssMetrics {
  const kind = bucketCategory(finding.category);
  const attackComplexity = KIND_TO_AC[kind];
  const promptInjectionSuccess = OUTCOME_TO_PIS[finding.severity];
  const impact = OUTCOME_TO_IMPACT[finding.severity];

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
