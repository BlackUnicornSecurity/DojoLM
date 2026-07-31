// SPDX-License-Identifier: Apache-2.0
/**
 * Arena match-event finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-ARENA — V1→V2 Restoration program (twelfth G.3
 * surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Arena Live + Replay surface
 * (the match-event entries rendered by `MatchLiveTab` in
 * `packages/dojolm-web/src/app/(shell)/admin/arena/ArenaLive.tsx`).
 *
 * Arena "findings" surface = the live match-event log + replay scrubber.
 * Each event row carries a closed-enum `MatchEventType` (16-value:
 * match_start / match_end / round_start / round_end / attack_sent /
 * attack_success / attack_blocked / defense_hold / flag_captured /
 * hill_claimed / hill_held / role_swap / score_update / sage_mutation /
 * fighter_error / timeout). The wire shape exposed via
 * `/api/arena/[id]/stream` is normalized client-side to `MatchEventLite`
 * (declared in `ArenaLive.tsx`) which carries `type` + `round` +
 * `fighterId` + `timestamp` + `role` BUT does NOT pass through the
 * upstream `severity` field declared on the canonical `MatchEvent` in
 * `packages/bu-tpi/src/arena/types.ts`. The wire shape on the SSE stream
 * does not include severity at all today — Arena severity is a per-event
 * referee/runner output that lands on the canonical `MatchEvent` but is
 * stripped before SSE serialization.
 *
 * Arena domain note — Arena match events are pure combat-step
 * observability events, NOT attack-class signals. Unlike scanner / Buki /
 * Sensei findings (which carry an explicit attack-category label), an
 * Arena match-event row's wire shape does NOT carry an attack-class
 * field; the closed enum available (`type`) describes lifecycle stage +
 * combat verb + outcome rather than the underlying attack technique.
 * Mapping these to `AttackKind` would be a domain misfit because:
 *   - `match_start` / `round_start` / `match_end` / `round_end` describe
 *     scheduling boundaries, not payload classes.
 *   - `attack_sent` / `attack_success` / `attack_blocked` describe an
 *     attack ATTEMPT but the underlying payload class
 *     (jailbreak / injection / encoding / override / social) is not
 *     exposed on the SSE event row — it lives upstream on the
 *     `MatchEvent.action` + the per-fighter `AgentConfig` in the runner
 *     state but is stripped before client serialization.
 *   - `defense_hold` describes a defender verdict but the payload class
 *     is not exposed.
 *   - `flag_captured` / `hill_claimed` / `hill_held` describe scoring
 *     events, not attack technique.
 *   - `role_swap` / `score_update` / `sage_mutation` describe
 *     match-state transitions, not attacks.
 *   - `fighter_error` / `timeout` describe operational failures, not
 *     attacks.
 *
 * Therefore — applying the RONIN + ONIGAESHI lessons (reviewer flagged
 * that a lifecycle-state enum was a domain misfit for attack-class
 * derivation) — this mapper SUPPRESSES client-side derivation: the host
 * client renders `<AivssPill band='none'>` until TICKET-G3-API-ARENA
 * ships a server-side `matchEvent.aivss` field. The mapper machinery
 * remains in place so the cross-G3-surface harness (GAR-001..GAR-006)
 * stays consistent with the other 11 surfaces, and so that once the
 * server schema lands the wire-passthrough path
 * ({@link findingToAivssMetrics}) has identical structure to the sister
 * modules. Until then, the host client does NOT call
 * `findingToAivssMetrics` on a match-event row — it passes through
 * `event.aivss ?? null` and renders `band='none'` on null.
 *
 * Mapping strategy (preserved for the future server-side AIVSS field
 * flow + for harness symmetry; NOT invoked client-side today):
 *   - finding.category (wide string at the client edge; closed
 *     `MatchEventType` 16-value enum at the server edge) is bucketed
 *     into the closed {@link AttackKind} taxonomy via
 *     {@link ARENA_CATEGORY_TO_KIND}. The mapping is exhaustive across
 *     every `MatchEventType` value; values outside the closed enum
 *     fall through to the EXPLICIT `'unknown'` kind (NOT a silent
 *     default).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami / Buki / Workbench / Sensei
 *     / Ronin / Amaterasu / Kotoba / Onigaeshi mappings verbatim for
 *     cross-domain consistency).
 *   - finding.severity (closed 4-value `ArenaSeverity` enum, lowercase:
 *     `'critical' | 'high' | 'medium' | 'low'`) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (critical/high → high,
 *         medium → medium, low → low — mirrors the 5-value sister
 *         mappings, modulo the absence of an `'info'` slot).
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (critical/high → high, medium → low, low → none — mirrors
 *         the sister 5-value mappings).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *     NOTE: the wire-shape exposed via `/api/arena/[id]/stream` does NOT
 *     pass through the upstream `severity` field today. The `severity`
 *     parameter on {@link findingToAivssMetrics} is preserved on the
 *     mapper signature for harness symmetry + the future server-side
 *     wire-passthrough flow (when TICKET-G3-API-ARENA lands the field
 *     on the SSE stream's MatchEventLite payload). Until then, the host
 *     client does NOT invoke this function at all.
 *   - attackVector defaults to 'network' (Arena matches target
 *     network-reachable LLM deployments — the per-fighter agent pools
 *     are network-reachable Atemi / Buki / Workbench fighters;
 *     adjacency / local / physical surface-area is not representable on
 *     the match-event surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Arena runs against
 *     production-payload posture; tier-2/3 calibration is a follow-up
 *     when a per-engagement run-context selector plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Arena surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS field on `/api/arena/[id]/stream` event payloads is
 * a separate follow-up (TICKET-G3-API-ARENA). This file is the
 * CLIENT-SIDE derivation only (intentionally suppressed at the host),
 * mirroring the G-3-SCANNER + G-3-MITSUKE + G-3-ATEMI + G-3-KAGAMI +
 * G-3-BUKI + G-3-WORKBENCH + G-3-SENSEI + G-3-RONIN + G-3-AMATERASU +
 * G-3-KOTOBA + G-3-ONIGAESHI pattern.
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
 * @see packages/bu-tpi/src/arena/types.ts — canonical `MatchEvent` source
 * @see packages/dojolm-web/src/app/(shell)/admin/arena/ArenaLive.tsx — `MatchEventType` + `MatchEventLite` host source
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
 * Closed 4-value Arena match-event severity enum, lowercase. Mirrors the
 * `severity` field declared on `MatchEvent` in
 * `packages/bu-tpi/src/arena/types.ts`.
 *
 * Re-declared here (not imported) to keep this mapping module pure /
 * unit-testable in isolation, mirroring the `RoninSeverity` /
 * `OnigaeshiSeverity` declarations in the sister modules. Note: the
 * wire-shape exposed via `/api/arena/[id]/stream` does NOT pass through
 * this severity field today; the parameter is preserved on the mapper
 * signature for the future server-side wire-passthrough flow.
 *
 * Note: unlike the 5-value sister enums (e.g. `RoninSeverity` which has
 * an `'info'` slot), Arena's canonical 4-value severity has no `'info'`
 * — the runner / referee assigns the lowest band as `'low'` for
 * non-critical events.
 */
export type ArenaSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

/**
 * Closed 16-value Arena match-event type enum, lowercase. Mirrors
 * `MatchEventType` declared in `ArenaLive.tsx`. Used as the bucketing
 * input in lieu of an explicit attack-class field on the match-event
 * wire shape (see module-doc rationale).
 *
 * Re-declared here as a local type union (not imported) to keep the
 * mapping module pure / unit-testable in isolation. New event types
 * that ship in the host enum without a row in
 * {@link ARENA_CATEGORY_TO_KIND} will trip GAR-003 (the exhaustiveness
 * test) until folded into the map.
 */
export type ArenaCategory =
  | 'match_start'
  | 'match_end'
  | 'round_start'
  | 'round_end'
  | 'attack_sent'
  | 'attack_success'
  | 'attack_blocked'
  | 'defense_hold'
  | 'flag_captured'
  | 'hill_claimed'
  | 'hill_held'
  | 'role_swap'
  | 'score_update'
  | 'sage_mutation'
  | 'fighter_error'
  | 'timeout';

/**
 * Local Finding shape used by the Arena match-event surface.
 * Mirrors the narrowed subset of the `MatchEventLite` declared in
 * `ArenaLive.tsx` (sanitized at fetch via the route's `MatchEventType`
 * enum gate) that the AIVSS mapping consumes — `category` (event type)
 * + `severity` (band) are the sufficient inputs.
 *
 * Re-declared here (not imported as `Pick<MatchEventLite, ...>`) to
 * keep this mapping module pure / unit-testable in isolation, mirroring
 * the `RoninFinding` / `OnigaeshiFinding` declarations in the sister
 * modules.
 *
 * `category` is typed as `string` (not the closed `ArenaCategory`
 * literal union) so the mapper accepts the widened client-edge shape.
 * The closed enum is enforced server-side via the route's
 * `isEventType` gate; `'unknown'` is the explicit fallback for any
 * value that bypasses the server-side gate (defence-in-depth for the
 * client-edge sanitization layer).
 */
export interface ArenaFinding {
  readonly category: string;
  readonly severity: ArenaSeverity;
}

/**
 * Closed taxonomy of Arena-attack kinds — bucketing layer between the
 * 16-value `ArenaCategory` (match-event type) enum and the 2-state
 * AivssAttackComplexity enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami + Buki + Workbench + Sensei + Ronin + Amaterasu +
 * Kotoba + Onigaeshi sister modules so cross-domain consumers can later
 * share a hoisted map. Per-domain divergence today: every Arena event
 * type slots either to `'injection'` (the dominant working hypothesis
 * when an explicit payload-class signal is absent for combat events
 * — the only attack types Arena fighters can submit are
 * prompt-injection / jailbreak / encoding / override / social, and the
 * combat-event types that DO describe attack attempts —
 * `attack_sent` / `attack_success` / `attack_blocked` — bucket to the
 * dominant injection-class default) or `'unknown'` (no payload-class
 * signal at all — match scheduling / scoring / fighter-state events).
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
 * Kotoba / Onigaeshi versions verbatim — kept duplicated rather than
 * hoisted because per-domain divergence on the input side is large
 * enough that a hoist would couple the twelve domains' input enums).
 *
 * - `jailbreak` → `'high'` (typically requires multi-turn or staged setup)
 * - `encoding` / `injection` / `override` / `social` → `'low'` (single-shot)
 * - `unknown` → `'low'` (conservative — assume the easier case for an
 *   un-categorized finding so the AIVSS score does not understate severity).
 *
 * @see ADR-0097 §1 metric 2 — AC closed enum
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — sister table
 * @see packages/dojolm-web/src/lib/onigaeshi/aivss-mapping.ts — sister table
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
 * Severity → AivssPis (Prompt Injection Success rate) for Arena match
 * events. The 4-value `ArenaSeverity` enum (lowercase) maps to the
 * 3-value `AivssPis` enum:
 *
 * - critical / high → `'high'` (>50% success — high-confidence
 *   exploit chain or critical/high-severity match event)
 * - medium → `'medium'` (10–50% — calibrated mid-band)
 * - low → `'low'` (<10% — recon / reference / observed-only)
 *
 * Mirrors the 5-value sister mappings verbatim, modulo the absence of
 * the `'info'` slot (Arena's canonical 4-value severity has no `'info'`
 * — the lowest band is `'low'`).
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<ArenaSeverity, AivssPis>> =
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
 * - low → `'none'` (no impact, recon / reference only)
 *
 * Mirrors the 5-value sister mappings verbatim, modulo the absence of
 * the `'info'` slot.
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<ArenaSeverity, AivssImpact>> =
  Object.freeze({
    critical: 'high',
    high: 'high',
    medium: 'low',
    low: 'none',
  });

/**
 * Default attack vector. Arena matches target network-reachable LLM
 * deployments — the per-fighter agent pools are network-reachable
 * Atemi / Buki / Workbench fighters running over the LLM gateway;
 * adjacency / local / physical surface-area is not representable on
 * the match-event surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Arena is the production-admin
 * fighter-validation hub; this is the worst-case default. Tier-2/3
 * calibration arrives when a run-context selector is plumbed through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Arena runs against in-flight
 * match-event payloads which by default are 'internal'-classified.
 * Per-engagement override is a follow-up when DSR classification
 * plumbs through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every Arena match-event type emitted by
 * `MatchEventType` (the 16-value closed enum in `ArenaLive.tsx`) to its
 * {@link AttackKind} bucket. Test GAR-003 verifies the table is
 * exhaustive against every member of the `ArenaCategory` closed union.
 *
 * Bucketing rationale (each event type → kind):
 *   - `match_start` / `match_end` — match scheduling boundary. No
 *     payload-class signal. Bucket → `'unknown'`.
 *   - `round_start` / `round_end` — round scheduling boundary. No
 *     payload-class signal. Bucket → `'unknown'`.
 *   - `attack_sent` — attacker submitted a payload to the defender.
 *     Default working hypothesis: Arena attacks against LLM defenders
 *     are injection-class (the dominant category in the prompt-injection
 *     corpus). Bucket → `'injection'`.
 *   - `attack_success` — same baseline payload class, just with the
 *     defender failing to block. Bucket → `'injection'`.
 *   - `attack_blocked` — same baseline payload class, just with the
 *     defender succeeding in blocking. Bucket → `'injection'`.
 *   - `defense_hold` — defender held against an unspecified attack.
 *     The prior payload class is not exposed on the match-event row;
 *     no payload-class signal. Bucket → `'unknown'`.
 *   - `flag_captured` / `hill_claimed` / `hill_held` — scoring events,
 *     no payload-class signal. Bucket → `'unknown'`.
 *   - `role_swap` — match-state transition (attacker ↔ defender).
 *     No payload-class signal. Bucket → `'unknown'`.
 *   - `score_update` — score recomputation tick. No payload-class
 *     signal. Bucket → `'unknown'`.
 *   - `sage_mutation` — SAGE adversarial mutation event. The prior
 *     payload class is not exposed on the match-event row; no
 *     payload-class signal. Bucket → `'unknown'`.
 *   - `fighter_error` — operational fighter failure (timeout / crash /
 *     malformed response). No payload-class signal. Bucket →
 *     `'unknown'`.
 *   - `timeout` — match timeout. No payload-class signal. Bucket →
 *     `'unknown'`.
 *
 * UPDATING: when a new match-event type lands (search:
 * `type MatchEventType =` in `ArenaLive.tsx`), add a row here mapping
 * it to the appropriate kind. Test GAR-003 will fail to remind future
 * maintainers if a new type lacks a mapping.
 *
 * FUTURE WORK: when the match-event wire shape lands an explicit
 * `attackClass` field (TICKET-G3-API-ARENA), migrate the bucketing
 * input to that field and retire this event-type-based fallback. The
 * event-type-based bucketing is a defensible default given Arena's
 * current shape but is NOT a substitute for a real attack-class label,
 * which is precisely why the host client today SUPPRESSES client-side
 * derivation and renders `band='none'` on the match-event chip
 * (RONIN + ONIGAESHI lesson — see module-doc rationale).
 */
export const ARENA_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    match_start: 'unknown',
    match_end: 'unknown',
    round_start: 'unknown',
    round_end: 'unknown',
    attack_sent: 'injection',
    attack_success: 'injection',
    attack_blocked: 'injection',
    defense_hold: 'unknown',
    flag_captured: 'unknown',
    hill_claimed: 'unknown',
    hill_held: 'unknown',
    role_swap: 'unknown',
    score_update: 'unknown',
    sage_mutation: 'unknown',
    fighter_error: 'unknown',
    timeout: 'unknown',
  } satisfies Record<ArenaCategory, AttackKind>);

/**
 * Bucket a raw `category` string (Arena match-event type) into a closed
 * {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link ARENA_CATEGORY_TO_KIND}. The server-side `MatchEventType` enum
 * is enforced at the SSE serializer layer, so concrete narrowing calls
 * resolve to a mapped kind today; the implicit `'unknown'` branch is
 * defence-in-depth for the client-edge sanitization layer (which
 * widens the wire shape to `string`). This is the EXPLICIT unknown slot
 * — we do NOT silently fall through to a default kind that would mask
 * a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  const kind = ARENA_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from an Arena match-event finding.
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * NOTE: this function is preserved for harness symmetry + for the
 * future server-side AIVSS field flow (TICKET-G3-API-ARENA). The
 * host client INTENTIONALLY does not invoke this on match-event rows
 * today (RONIN + ONIGAESHI-precedent suppression). When the server
 * schema lands, the `event.aivss` wire passthrough takes over and
 * chips populate automatically with no additional client changes.
 *
 * @param finding — narrow Arena finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Arena match-events AIVSS field
 */
export function findingToAivssMetrics(finding: ArenaFinding): AivssMetrics {
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
