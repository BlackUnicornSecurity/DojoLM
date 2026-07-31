// SPDX-License-Identifier: Apache-2.0
/**
 * Sengoku temporal-run finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-SENGOKU — V1→V2 Restoration program (fourteenth
 * G.3 surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Sengoku Temporal-runs surface
 * (the `RunsTab` table rows in
 * `packages/dojolm-web/src/app/(shell)/admin/sengoku/SengokuTabs.tsx`).
 *
 * Sengoku "findings" surface = the temporal-run rows produced by the
 * `/api/sengoku/temporal/runs` endpoint. Each run row carries a closed
 * 5-value {@link AttackType} enum (`accumulation | delayed-activation |
 * session-persistence | context-overflow | persona-drift`) plus the
 * server runtime verdict (`safe | at-risk | compromised`). That runtime
 * verdict is a DIFFERENT vocabulary from this module's 4-value
 * {@link SengokuVerdict} (`safe | flagged | compromised | inconclusive`):
 * `SengokuTabs.tsx` translates runtime → AIVSS via its `RUNTIME_TO_AIVSS`
 * map (`at-risk → flagged`) before calling {@link findingToAivssMetrics}.
 * Both enums are sanitized at fetch time (`isAttackType` / `isVerdict`
 * in `SengokuTabs.tsx`) before the row reaches the AIVSS chip slot.
 *
 * Sengoku domain note — Sengoku temporal runs DO carry an explicit
 * attack-class signal: the `attackType` field is the canonical
 * temporal-orchestration attack taxonomy (multi-turn / staged / persistent
 * exploit chains). Unlike the Ronin / Onigaeshi / Arena suppression
 * precedents (where the available closed enum was a lifecycle-state
 * proxy, NOT a real attack-class), Sengoku's `attackType` IS a real
 * attack-class. This is the LIVE-derivation pattern (mirrors Scanner /
 * Mitsuke / Atemi / Kagami / Buki / Workbench / Sensei / Amaterasu /
 * Kotoba / Hattori — eleven of fourteen G-3 surfaces; only the three
 * lifecycle-proxy surfaces suppress).
 *
 * Mapping strategy:
 *   - finding.category (wide string at the client edge; closed
 *     `AttackType` 5-value enum at the server edge) is bucketed
 *     into the closed {@link AttackKind} taxonomy via
 *     {@link SENGOKU_CATEGORY_TO_KIND}. The mapping is exhaustive across
 *     every `AttackType` value; values outside the closed enum fall
 *     through to the EXPLICIT `'unknown'` kind (NOT a silent default).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench / Sensei
 *     / Ronin / Amaterasu / Kotoba / Onigaeshi / Arena / Hattori
 *     mappings verbatim for cross-domain consistency).
 *   - finding.severity (closed 4-value `SengokuVerdict` enum, lowercase:
 *     `'safe' | 'flagged' | 'compromised' | 'inconclusive'`) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (compromised → high,
 *         flagged → medium, inconclusive/safe → low — verdict semantics
 *         differ from severity, see VERDICT mapping rationale in the
 *         table doc).
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (compromised → high, flagged → low, inconclusive/safe → none).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Sengoku temporal runs target
 *     network-reachable LLM deployments — the campaign's resolved target
 *     is an external URL / dashboard model / local Ollama gateway, all
 *     network-reachable; adjacency / local / physical surface-area is
 *     not representable on the temporal-run surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Sengoku runs against
 *     production-payload posture; tier-2/3 calibration is a follow-up
 *     when a per-engagement run-context selector plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Sengoku surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/sengoku/temporal/runs` response is a
 * separate follow-up (TICKET-G3-API-SENGOKU). This file is the
 * CLIENT-SIDE derivation only, mirroring the prior thirteen G-3
 * surfaces' pattern.
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
 * @see packages/dojolm-web/src/app/(shell)/admin/sengoku/SengokuTabs.tsx — `AttackType` + `RunVerdict` host source
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
 * Closed 4-value Sengoku run verdict enum, lowercase. Mirrors the
 * `RunVerdict` declared in
 * `packages/dojolm-web/src/app/(shell)/admin/sengoku/SengokuTabs.tsx`.
 *
 * Re-declared here (not imported as a type alias) to keep this mapping
 * module pure / unit-testable in isolation, mirroring the
 * `ScanFinding` / `MitsukeFinding` / `ArenaSeverity` declarations in
 * the sister modules.
 *
 * Note: unlike the 5-value sister enums (e.g. `RoninSeverity` which has
 * an `'info'` slot + `MitsukeSeverity` with `'critical'`), Sengoku's
 * 4-value verdict enum has its own semantic per slot:
 *   - compromised: full breach observed (critical-class)
 *   - flagged: risk surfaced but bounded (high-class)
 *   - inconclusive: no clear signal (low-class)
 *   - safe: no breach observed (info-class)
 */
export type SengokuVerdict =
  | 'safe'
  | 'flagged'
  | 'compromised'
  | 'inconclusive';

/**
 * Canonical readonly array of every {@link SengokuVerdict} value. Used
 * by tests for exhaustiveness checks against the closed-enum maps.
 */
export const SENGOKU_VERDICTS: readonly SengokuVerdict[] = Object.freeze([
  'safe',
  'flagged',
  'compromised',
  'inconclusive',
]);

/**
 * Closed 5-value Sengoku temporal attack-type enum, lowercase. Mirrors
 * `AttackType` declared in `SengokuTabs.tsx`. Used as the bucketing
 * input — every value is a real attack-class signal (multi-turn /
 * staged / persistent exploit chain), unlike the lifecycle-proxy
 * suppression precedents (Ronin / Onigaeshi / Arena).
 *
 * Re-declared here as a local type union (not imported) to keep the
 * mapping module pure / unit-testable in isolation. New attack types
 * that ship in the host enum without a row in
 * {@link SENGOKU_CATEGORY_TO_KIND} will trip GSE-003 (the
 * exhaustiveness test) until folded into the map.
 */
export type AttackType =
  | 'accumulation'
  | 'delayed-activation'
  | 'session-persistence'
  | 'context-overflow'
  | 'persona-drift';

/**
 * Canonical readonly array of every {@link AttackType} value. Used by
 * tests for exhaustiveness checks against the closed-enum maps.
 */
export const SENGOKU_ATTACK_TYPES: readonly AttackType[] = Object.freeze([
  'accumulation',
  'delayed-activation',
  'session-persistence',
  'context-overflow',
  'persona-drift',
]);

/**
 * Local Finding shape used by the Sengoku temporal-run surface.
 * Mirrors the narrowed subset of the `RunRecordLite` declared in
 * `SengokuTabs.tsx` (sanitized at fetch via `sanitizeRun` /
 * `isAttackType` / `isVerdict`) that the AIVSS mapping consumes —
 * `category` (attack type) + `severity` (verdict) are the sufficient
 * inputs.
 *
 * Re-declared here (not imported as `Pick<RunRecordLite, ...>`) to
 * keep this mapping module pure / unit-testable in isolation,
 * mirroring the `RoninFinding` / `OnigaeshiFinding` / `ArenaFinding`
 * declarations in the sister modules.
 *
 * `category` is typed as `string` (not the closed `AttackType` literal
 * union) so the mapper accepts the widened client-edge shape. The
 * closed enum is enforced server-side via the route's `isAttackType`
 * gate; `'unknown'` is the explicit fallback for any value that
 * bypasses the server-side gate (defence-in-depth for the client-edge
 * sanitization layer).
 */
export interface SengokuFinding {
  readonly category: string;
  readonly severity: SengokuVerdict;
}

/**
 * Closed taxonomy of Sengoku-attack kinds — bucketing layer between the
 * 5-value `AttackType` enum and the 2-state AivssAttackComplexity enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami + Buki + Workbench + Sensei + Ronin + Amaterasu +
 * Kotoba + Onigaeshi + Arena + Hattori sister modules so cross-domain
 * consumers can later share a hoisted map. Per-domain divergence today:
 * 4 of the 5 Sengoku attack types bucket into `'jailbreak'` (multi-turn
 * / staged / persistent / persona-manipulation patterns); 1 buckets
 * into `'injection'` (single-shot context-overflow attack).
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
 * Kotoba / Onigaeshi / Arena / Hattori versions verbatim — kept
 * duplicated rather than hoisted because per-domain divergence on the
 * input side is large enough that a hoist would couple the fourteen
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
 * Verdict → AivssPis (Prompt Injection Success rate) for Sengoku
 * temporal runs. The 4-value `SengokuVerdict` enum maps to the 3-value
 * `AivssPis` enum:
 *
 * - compromised → `'high'` (>50% success — full breach observed)
 * - flagged → `'medium'` (10–50% — risk surfaced but bounded; the
 *   referee caught the chain before terminal compromise)
 * - inconclusive → `'low'` (<10% — no clear signal one way or the
 *   other; recon-level activity)
 * - safe → `'low'` (<10% — no breach observed; the chain ran to
 *   completion without surfacing risk)
 *
 * Verdict semantics differ from severity-class: `safe` is the
 * "all-clear" terminal state (NOT severity 'info' which is "lowest
 * informational signal"); both compress to PIS=low because neither
 * carries an active exploit signal. The differentiation between safe
 * and inconclusive shows up on the {@link SEVERITY_TO_IMPACT} table
 * (both → 'none') — the 3-state PIS enum cannot represent the nuance.
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<SengokuVerdict, AivssPis>> =
  Object.freeze({
    compromised: 'high',
    flagged: 'medium',
    inconclusive: 'low',
    safe: 'low',
  });

/**
 * Verdict → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when richer
 * metadata arrives.
 *
 * - compromised → `'high'` (full / large compromise of the dimension —
 *   terminal breach in the temporal chain)
 * - flagged → `'low'` (partial / bounded compromise — referee caught
 *   the chain mid-flight)
 * - inconclusive → `'none'` (no impact, no clear signal)
 * - safe → `'none'` (no impact, chain ran clean)
 *
 * Mirrors the sister 4-value Arena mapping in shape (no 'info' slot)
 * but with the verdict-specific semantics applied per slot.
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<SengokuVerdict, AivssImpact>> =
  Object.freeze({
    compromised: 'high',
    flagged: 'low',
    inconclusive: 'none',
    safe: 'none',
  });

/**
 * Default attack vector. Sengoku temporal runs target network-reachable
 * LLM deployments — the campaign's resolved target is one of:
 *   - external URL (network-reachable LLM gateway)
 *   - dashboard model (network-reachable internal model config)
 *   - local Ollama (network-reachable on localhost)
 * adjacency / local / physical surface-area is not representable on
 * the temporal-run surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Sengoku is the production-admin
 * temporal-orchestration hub; this is the worst-case default. Tier-2/3
 * calibration arrives when a run-context selector is plumbed through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Sengoku runs against in-flight
 * temporal-run payloads which by default are 'internal'-classified.
 * Per-engagement override is a follow-up when DSR classification
 * plumbs through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every Sengoku attack-type emitted by
 * `AttackType` (the 5-value closed enum in `SengokuTabs.tsx`) to its
 * {@link AttackKind} bucket. Test GSE-003 verifies the table is
 * exhaustive against every member of the {@link AttackType} closed
 * union.
 *
 * Bucketing rationale (each attack type → kind):
 *   - `accumulation` — multi-turn build-up where each turn adds a tiny
 *     piece of the eventual exploit. Canonical multi-turn jailbreak
 *     primitive (the chain is structured to evade single-turn guards
 *     by spreading payload across the conversation history). Bucket
 *     → `'jailbreak'`.
 *   - `delayed-activation` — staged setup where the trigger payload
 *     activates a previously-implanted exploit (e.g. a benign-looking
 *     turn followed by a delayed retrieval-trigger). Multi-turn
 *     staged-attack primitive. Bucket → `'jailbreak'`.
 *   - `session-persistence` — the exploit persists across session
 *     boundaries (e.g. via memory / context-window leak / RAG cache
 *     poison). Multi-turn / cross-session attack primitive. Bucket
 *     → `'jailbreak'`.
 *   - `context-overflow` — single-shot attack where the prompt
 *     overflows the context window to dislodge the system prompt or
 *     to push attacker-controlled content into the active reasoning
 *     window. Single-turn injection primitive. Bucket → `'injection'`.
 *   - `persona-drift` — multi-turn persona-manipulation where the
 *     attacker incrementally pushes the model out of its assigned
 *     persona until safety constraints lapse. Persona manipulation
 *     is the canonical jailbreak primitive (mirrors Kagami's
 *     `persona-bleed` rationale). Bucket → `'jailbreak'`.
 *
 * UPDATING: when a new temporal attack type lands (search:
 * `type AttackType =` in `SengokuTabs.tsx`), add a row here mapping
 * it to the appropriate kind. Test GSE-003 will fail to remind future
 * maintainers if a new type lacks a mapping.
 */
export const SENGOKU_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    accumulation: 'jailbreak',
    'delayed-activation': 'jailbreak',
    'session-persistence': 'jailbreak',
    'context-overflow': 'injection',
    'persona-drift': 'jailbreak',
  } satisfies Record<AttackType, AttackKind>);

/**
 * Bucket a raw `category` string (Sengoku temporal attack-type) into a
 * closed {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link SENGOKU_CATEGORY_TO_KIND}. The server-side `AttackType` enum
 * is enforced at the fetch boundary via `isAttackType`, so concrete
 * narrowing calls resolve to a mapped kind today; the implicit
 * `'unknown'` branch is defence-in-depth for the client-edge
 * sanitization layer (which widens the wire shape to `string`). This
 * is the EXPLICIT unknown slot — we do NOT silently fall through to a
 * default kind that would mask a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  const kind = SENGOKU_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a Sengoku temporal-run finding.
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Sengoku finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Sengoku temporal-runs AIVSS field
 */
export function findingToAivssMetrics(finding: SengokuFinding): AivssMetrics {
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
