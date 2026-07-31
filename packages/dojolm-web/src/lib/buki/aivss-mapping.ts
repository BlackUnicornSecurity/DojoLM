// SPDX-License-Identifier: Apache-2.0
/**
 * Buki SAGE-seed / fuzz-test finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-BUKI — V1→V2 Restoration program (fifth G.3 surface).
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Buki SAGE-seed corpus
 * findings table (the Generator → Seeds tab).
 *
 * Buki "findings" surface = the seed-corpus rows surfaced by the SAGE
 * Generator. Each seed row carries a `SeedCategory` (20-value closed
 * enum, sourced from `lib/sage/fixtures.ts`) + `SageCriticity` (5-value
 * closed enum, `'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'`). The
 * server-side route enforces the closed enum
 * (`packages/dojolm-web/src/app/api/buki/sage/seeds/route.ts` —
 * `VALID_CATEGORIES = new Set(SEED_CATEGORIES)`); the client-side
 * `sanitizeSeed` widens to `string` for defence-in-depth, so this
 * mapper accepts a wide `string` for `category` and falls through to
 * the EXPLICIT `'unknown'` kind for any value outside the closed table
 * (mirrors the scanner mapper which has the same wide-string +
 * explicit-unknown shape).
 *
 * Mapping strategy:
 *   - finding.category (wide string at the client edge; closed
 *     `SeedCategory` 20-value enum at the server edge) is bucketed into
 *     the closed {@link AttackKind} taxonomy via
 *     {@link BUKI_CATEGORY_TO_KIND}. The mapping is exhaustive across
 *     every `SeedCategory` value; values outside the closed enum fall
 *     through to the EXPLICIT `'unknown'` kind (NOT a silent default).
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC} (mirrors
 *     the scanner / Mitsuke / Atemi / Kagami mappings for cross-domain
 *     consistency).
 *   - finding.severity (closed 5-value `SageCriticity` enum) drives:
 *       - PIS rate via {@link SEVERITY_TO_PIS} (CRITICAL/HIGH → high,
 *         MEDIUM → medium, LOW/INFO → low — mirrors Mitsuke + Atemi +
 *         Kagami 5-value mappings)
 *       - 3-impact triple uniformly via {@link SEVERITY_TO_IMPACT}
 *         (CRITICAL/HIGH → high, MEDIUM → low, LOW/INFO → none).
 *     Per ADR-0097 §3 default-rule for finding-level scoring; per-impact
 *     decomposition is a follow-up when richer metadata lands.
 *   - attackVector defaults to 'network' (Buki SAGE seeds target
 *     network-reachable LLM deployments — DojoLM, BonkLM, Basileak,
 *     PantheonLM, Marfaak; adjacency / local / physical surface-area is
 *     not representable on the seed-corpus surface today).
 *   - modelCriticality defaults to 'tier-1' (V2 admin Buki runs against
 *     production-payload posture; tier-2/3 calibration is a follow-up
 *     when a per-engagement run-context selector plumbs through).
 *   - dataSensitivity defaults to 'internal' (admin Buki surface;
 *     per-engagement override is a follow-up when DSR classification
 *     plumbs through).
 *
 * Server-side AIVSS derivation lives in
 * `packages/dojolm-web/src/lib/aivss/computeForSeed.ts` (composes this
 * mapper with `calculate` from `bu-tpi/aivss`) and is attached per-row
 * on `/api/buki/sage/seeds` GET + POST responses. This file remains the
 * canonical pure mapping module — used by both server (computeForSeed)
 * and client (BukiClient.tsx legacy derivation path being deprecated).
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

import type { SageCriticity, SeedCategory } from '@/lib/sage/fixtures';

/**
 * Canonical readonly array of every {@link SageCriticity} value.
 *
 * Hardcoded literal (NOT derived from `Object.keys(SEVERITY_TO_PIS)`) so
 * that:
 *   - a hostile module-pollution scenario can't extend the allow-list at
 *     module init via `Object.defineProperty(SEVERITY_TO_PIS, ...)`.
 *   - the type union and the runtime allow-list stay in lock-step at
 *     compile time — the `satisfies` check below ensures the literal
 *     covers every member of the closed union.
 *
 * Mirrors `RONIN_SEVERITIES` + `JUTSU_SEVERITIES` in the sister mapping
 * modules verbatim (modulo the UPPERCASE convention used by SAGE).
 */
export const BUKI_SEVERITIES: readonly SageCriticity[] = Object.freeze([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
] satisfies readonly SageCriticity[]);

/**
 * Local Finding shape used by the Buki SAGE-seed findings surface.
 * Mirrors the narrowed subset of the BukiClient `SeedRecord` (sanitized
 * at fetch in `BukiClient.tsx`) that the AIVSS mapping consumes —
 * `category` + `criticity` are the sufficient inputs. Renamed
 * `criticity` → `severity` at the mapper boundary so the call shape
 * matches the scanner / Mitsuke / Atemi / Kagami sister modules
 * (downstream consumers pass
 * `{ category: seed.category, severity: seed.criticity }`).
 *
 * Re-declared here (not imported as `Pick<SeedRecord, ...>`) to keep
 * this mapping module pure / unit-testable in isolation, mirroring the
 * `ScanFinding` + `MitsukeFinding` + `AtemiFinding` + `KagamiFinding`
 * declarations in the sister modules.
 *
 * `category` is typed as `string` (not `SeedCategory`) so the mapper
 * accepts the widened client-edge shape. The closed `SeedCategory`
 * enum is enforced server-side; `'unknown'` is the explicit fallback
 * for any value that bypasses the server-side gate (defence-in-depth
 * for the client-edge sanitization layer).
 */
export interface BukiFinding {
  readonly category: string;
  readonly severity: SageCriticity;
}

/**
 * Closed taxonomy of Buki-attack kinds — bucketing layer between the
 * 20-value `SeedCategory` enum and the 2-state AivssAttackComplexity
 * enum.
 *
 * Same {@link AttackKind} closed-enum shape as the scanner + Mitsuke +
 * Atemi + Kagami sister modules so cross-domain consumers can later
 * share a hoisted map. Per-domain divergence today: every `SeedCategory`
 * slots cleanly into one of the 5 named kinds; the 20-value enum maps
 * are wider than the 8-value Atemi/Kagami enums but narrower than the
 * ~67-pattern scanner enum.
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
 * Atemi / Kagami versions verbatim — kept duplicated rather than hoisted
 * because per-domain divergence on the input side is large enough that a
 * hoist would couple the five domains' input enums).
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
 * Severity → AivssPis (Prompt Injection Success rate) for Buki findings.
 * The 5-value `SageCriticity` enum collapses into the 3-value `AivssPis`
 * enum (mirrors Mitsuke + Atemi + Kagami 5-value mappings verbatim):
 *
 * - CRITICAL / HIGH → `'high'` (>50% success — high-confidence indicator
 *   with active exploit signal in the SAGE corpus)
 * - MEDIUM → `'medium'` (10–50% — calibrated mid-band)
 * - LOW / INFO → `'low'` (<10% — recon / reference / observed-only)
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<SageCriticity, AivssPis>> =
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
export const SEVERITY_TO_IMPACT: Readonly<Record<SageCriticity, AivssImpact>> =
  Object.freeze({
    CRITICAL: 'high',
    HIGH: 'high',
    MEDIUM: 'low',
    LOW: 'none',
    INFO: 'none',
  });

/**
 * Default attack vector. Buki SAGE seeds target network-reachable LLM
 * deployments (DojoLM / BonkLM / Basileak / PantheonLM / Marfaak);
 * adjacent / local / physical surface-area is not representable on the
 * seed-corpus surface today.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin Buki is tuned for tier-1
 * (production user-facing) posture; this is the worst-case default.
 * Tier-2/3 calibration arrives when a run-context selector is plumbed
 * through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin Buki runs against in-flight LLM
 * traffic which by default is 'internal'-classified. Per-engagement
 * override is a follow-up when DSR classification plumbs through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every `SeedCategory` to its
 * {@link AttackKind} bucket. Test GB-003 verifies the table is
 * exhaustive against every member of the `SeedCategory` closed
 * union (sourced from `lib/sage/fixtures.ts`).
 *
 * Bucketing rationale (each category → kind):
 *   - `injection` — direct prompt-instruction injection. The injection
 *     class by definition. Bucket → `'injection'`.
 *   - `jailbreak` — multi-turn / framing-based safety bypass. Typical
 *     jailbreak attacks need staged setup. Bucket → `'jailbreak'`.
 *   - `extraction` — context / secret / training-data extraction.
 *     Direct embedding into the prompt + parse-out style attack.
 *     Bucket → `'injection'`.
 *   - `encoding` — base64 / unicode / hex obfuscation of the payload.
 *     Single-shot transformation. Bucket → `'encoding'`.
 *   - `social` — single-shot social-engineering pretext at the model
 *     layer. Bucket → `'social'`.
 *   - `multi-turn` — multi-turn constraint flip. Staged setup through
 *     conversation history. Bucket → `'jailbreak'`.
 *   - `system-prompt` — system-prompt override / extraction. Authority
 *     flip at the system-prompt boundary. Bucket → `'override'`.
 *   - `tool-abuse` — tool-call hijack / function-call override. Flips
 *     authority of the tool registry. Bucket → `'override'`.
 *   - `indirect-injection` — payload arrives via secondary channel
 *     (search / doc / page). Direct injection class regardless of
 *     channel. Bucket → `'injection'`.
 *   - `ansi-escape` — ANSI escape-code obfuscation. Single-shot
 *     encoded variation. Bucket → `'encoding'`.
 *   - `zero-width` — zero-width / invisible-char obfuscation.
 *     Single-shot encoded variation. Bucket → `'encoding'`.
 *   - `homoglyph` — visually-confusable character substitution.
 *     Single-shot encoded variation. Bucket → `'encoding'`.
 *   - `markdown-injection` — markdown-format injection (links / images /
 *     hidden HTML). Direct embedding into the rendered output.
 *     Bucket → `'injection'`.
 *   - `agentic-loop` — runaway tool-call loops / scope expansion.
 *     System constraint flip (the safety-loop limiter is the
 *     constraint). Bucket → `'override'`.
 *   - `memory-poisoning` — long-term memory / context-store
 *     manipulation. Authority flip at the memory boundary.
 *     Bucket → `'override'`.
 *   - `context-overflow` — context-window saturation to displace
 *     system instructions. System constraint flip. Bucket →
 *     `'override'`.
 *   - `pii-extraction` — PII enumeration / training-data extraction.
 *     Direct embedding into the prompt + parse-out style attack.
 *     Bucket → `'injection'`.
 *   - `cost-amplification` — token-amplification denial-of-budget.
 *     Single-shot social-engineering vector at the model layer
 *     (asks the model to do expensive work). Bucket → `'social'`.
 *   - `compliance-bypass` — role-play / pretext to loosen compliance
 *     gates. Single-shot social-engineering vector at the model
 *     layer. Bucket → `'social'`.
 *   - `multi-modal` — hidden prompt in image / audio / video.
 *     Encoded payload form across a non-text channel. Bucket →
 *     `'encoding'`.
 *
 * UPDATING: when a new SeedCategory lands (search:
 * `export const SEED_CATEGORIES = [` in `lib/sage/fixtures.ts`), add
 * a row here mapping it to the appropriate kind. Test GB-003 will
 * fail to remind future maintainers if a new category lacks a
 * mapping.
 */
export const BUKI_CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    injection: 'injection',
    jailbreak: 'jailbreak',
    extraction: 'injection',
    encoding: 'encoding',
    social: 'social',
    'multi-turn': 'jailbreak',
    'system-prompt': 'override',
    'tool-abuse': 'override',
    'indirect-injection': 'injection',
    'ansi-escape': 'encoding',
    'zero-width': 'encoding',
    homoglyph: 'encoding',
    'markdown-injection': 'injection',
    'agentic-loop': 'override',
    'memory-poisoning': 'override',
    'context-overflow': 'override',
    'pii-extraction': 'injection',
    'cost-amplification': 'social',
    'compliance-bypass': 'social',
    'multi-modal': 'encoding',
  } satisfies Record<SeedCategory, AttackKind>);

/**
 * Bucket a raw `category` string into a closed {@link AttackKind}.
 *
 * Returns `'unknown'` for category values not present in
 * {@link BUKI_CATEGORY_TO_KIND}. The server-side route enforces the
 * closed `SeedCategory` enum, so concrete narrowing calls resolve to a
 * non-`'unknown'` kind today; the `'unknown'` branch is
 * defence-in-depth for the client-edge sanitization layer (which
 * widens the wire shape to `string`). This is the EXPLICIT unknown
 * slot — we do NOT silently fall through to a default kind that
 * would mask a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  // Mirror the Ronin / Jutsu sister modules' `Object.hasOwn` guard.
  // Without this, a `category` value of `'__proto__'` / `'constructor'` /
  // `'toString'` would resolve to a prototype-chain object (not
  // `undefined`), bypassing the `??` fallback and producing an invalid
  // `AttackKind` that breaks downstream `KIND_TO_AC` lookup.
  if (!Object.hasOwn(BUKI_CATEGORY_TO_KIND, category)) return 'unknown';
  const kind = BUKI_CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a Buki finding (SAGE-seed row).
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow Buki finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Buki findings AIVSS field
 */
export function findingToAivssMetrics(finding: BukiFinding): AivssMetrics {
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
