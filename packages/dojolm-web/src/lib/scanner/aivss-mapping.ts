// SPDX-License-Identifier: Apache-2.0
/**
 * Scanner finding → AIVSS metrics mapping.
 *
 * Phase G.3 / TICKET-G3-SCANNER — V1→V2 Restoration program.
 *
 * Pure function `findingToAivssMetrics(finding) → AivssMetrics`. Closed-enum
 * mapping tables (no silent defaults via `default:` fallthrough). Output is
 * fed to {@link calculate} from `bu-tpi/aivss` to derive a per-finding
 * {@link AivssScore} for chip rendering on the Scanner findings table.
 *
 * Mapping strategy:
 *   - finding.category (string, ~67 known scanner pattern categories) is first
 *     bucketed into a closed {@link AttackKind} taxonomy via
 *     {@link CATEGORY_TO_KIND}. Unknown/new categories map to `'unknown'`
 *     explicitly — NOT a silent default.
 *   - AttackKind → AivssAttackComplexity via {@link KIND_TO_AC}.
 *   - finding.severity (closed `'INFO'|'WARNING'|'CRITICAL'` enum) drives:
 *       - PIS rate (severity → low/medium/high)
 *       - 3-impact triple (severity → none/low/high uniformly per ADR-0097
 *         §3 default-rule for finding-level scoring; per-impact decomposition
 *         is a follow-up when the scanner emits richer metadata).
 *   - attackVector defaults to 'network' (scanner findings come from prompt
 *     input which is by definition network-reachable in the V2 admin surface).
 *   - modelCriticality defaults to 'tier-1' (V2 admin/scanner runs against
 *     production posture; tier-2/3 calibration is a follow-up when the run
 *     context is plumbed through).
 *   - dataSensitivity defaults to 'internal' (admin scanner default; tunable
 *     per-engagement when DSR classification is plumbed through).
 *
 * Server-side AIVSS field on `/api/scan` response is a separate follow-up
 * (TICKET-G3-API). This file is the CLIENT-SIDE derivation only.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Scanner findings AIVSS field
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
 * Local Finding shape used by the Scanner findings table. Mirrors the
 * `Finding` interface in `ScannerClient.tsx` (intentionally a narrow subset
 * of `bu-tpi/types`'s Finding — only fields the AIVSS mapping consumes).
 *
 * Re-declared here to avoid a circular dep against ScannerClient and to keep
 * the mapping module pure / unit-testable in isolation.
 */
export type ScanFindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface ScanFinding {
  readonly category: string;
  readonly severity: ScanFindingSeverity;
}

/**
 * Closed taxonomy of scanner-attack kinds — bucketing layer between the
 * ~67 raw `category` strings and the 2-state AivssAttackComplexity enum.
 *
 * `'unknown'` is the EXPLICIT slot for category strings the scanner emits
 * that we haven't yet mapped — NOT a silent default. New scanner categories
 * surface via `'unknown'` and are intended to trigger a CATEGORY_TO_KIND
 * extension PR (test GS-003 enforces every known cat has a mapping).
 */
export type AttackKind =
  | 'jailbreak'
  | 'encoding'
  | 'injection'
  | 'override'
  | 'social'
  | 'unknown';

/**
 * AttackKind → AivssAttackComplexity mapping.
 *
 * - `jailbreak` → `'high'` (typically requires multi-turn or staged setup)
 * - `encoding` / `injection` / `override` / `social` → `'low'` (single-shot)
 * - `unknown` → `'low'` (conservative — assume the easier case for an
 *   un-categorized finding so the AIVSS score does not understate severity).
 *
 * @see ADR-0097 §1 metric 2 — AC closed enum
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
 * Severity → AivssPis (Prompt Injection Success rate).
 *
 * - CRITICAL findings imply high success in the wild (the matched pattern
 *   is a high-confidence indicator of effective injection).
 * - WARNING findings imply medium.
 * - INFO findings imply low (recon / signal only, no exploit demonstrated).
 *
 * @see ADR-0097 §1 metric 3 — PIS closed enum
 */
export const SEVERITY_TO_PIS: Readonly<Record<ScanFindingSeverity, AivssPis>> =
  Object.freeze({
    INFO: 'low',
    WARNING: 'medium',
    CRITICAL: 'high',
  });

/**
 * Severity → AivssImpact (uniform across CIA triple at the per-finding
 * baseline). Per-impact decomposition is a follow-up when the scanner
 * emits richer metadata.
 *
 * - CRITICAL → `'high'` (full compromise of the dimension)
 * - WARNING → `'low'` (partial / bounded compromise)
 * - INFO → `'none'` (no impact, recon only)
 *
 * @see ADR-0097 §1 metrics 6–8 — Impact closed enum
 */
export const SEVERITY_TO_IMPACT: Readonly<Record<ScanFindingSeverity, AivssImpact>> =
  Object.freeze({
    INFO: 'none',
    WARNING: 'low',
    CRITICAL: 'high',
  });

/**
 * Default attack vector. Scanner runs against prompt input on a
 * network-reachable admin surface.
 */
export const DEFAULT_ATTACK_VECTOR: AivssAttackVector = 'network';

/**
 * Default model criticality. V2 admin scanner is tuned for tier-1 (production
 * user-facing) posture; this is the worst-case default. Tier-2/3 calibration
 * arrives when a run-context selector is plumbed through.
 */
export const DEFAULT_MODEL_CRITICALITY: AivssMc = 'tier-1';

/**
 * Default data sensitivity. Admin scanner runs against in-flight prompts
 * which by default are 'internal'-classified. Per-engagement override is a
 * follow-up when DSR classification is plumbed through.
 */
export const DEFAULT_DATA_SENSITIVITY: AivssDs = 'internal';

/**
 * Closed-enum mapping from every scanner pattern category emitted by
 * `bu-tpi/scanner` to its {@link AttackKind} bucket. Test GS-003 verifies
 * the table is exhaustive against the live scanner pattern catalogue.
 *
 * UPDATING: when a new scanner pattern category lands (search:
 * `cat: '<NEW_CATEGORY>'` in `packages/bu-tpi/src/scanner.ts`), add a row
 * here mapping it to the appropriate kind. Categories that slip through
 * fall to the `'unknown'` kind via {@link bucketCategory} — they still
 * score, but with a conservative mapping, and the test will fail to
 * remind future maintainers to make the mapping explicit.
 */
export const CATEGORY_TO_KIND: Readonly<Record<string, AttackKind>> =
  Object.freeze({
    // Jailbreak family — multi-turn / staged setup typical
    DAN: 'jailbreak',
    MODERN_JAILBREAK: 'jailbreak',
    TRANSLATION_JAILBREAK: 'jailbreak',
    HYPOTHETICAL: 'jailbreak',
    HYPOTHETICAL_FRAMING: 'jailbreak',
    FICTION_FRAMING: 'jailbreak',
    ROLEPLAY: 'jailbreak',
    ROLEPLAY_MANIPULATION: 'jailbreak',
    PERSONA_MANIPULATION: 'jailbreak',
    REVERSE_PSYCHOLOGY: 'jailbreak',

    // Encoding / obfuscation — single-shot transformation
    ENCODED_PAYLOAD: 'encoding',
    OBFUSCATION: 'encoding',
    ADVANCED_OBFUSCATION: 'encoding',
    WHITESPACE_EVASION: 'encoding',
    SYNONYM_SUBSTITUTION: 'encoding',
    MULTILINGUAL: 'encoding',
    SURROGATE_FORMAT_INJECTION: 'encoding',
    OCR_ATTACK: 'encoding',

    // Injection family — direct embedding into prompt / output / context
    INSTRUCTION_INJECTION: 'injection',
    ALTERED_PROMPT_INJECTION: 'injection',
    RECURSIVE_INJECTION: 'injection',
    API_RESPONSE_INJECTION: 'injection',
    AGENT_OUTPUT_INJECTION: 'injection',
    SEARCH_RESULT_INJECTION: 'injection',
    SHARED_DOC_INJECTION: 'injection',
    SQL_INJECTION: 'injection',
    HTML_HIDDEN_INJECTION: 'injection',
    CSS_HIDDEN_INJECTION: 'injection',
    SVG_INJECTION: 'injection',
    IFRAME_INJECTION: 'injection',
    META_TAG_INJECTION: 'injection',
    DATA_ATTR_INJECTION: 'injection',
    ARIA_INJECTION: 'injection',
    LINK_TITLE_INJECTION: 'injection',
    CODE_FORMAT_INJECTION: 'injection',
    PLUGIN_INJECTION: 'injection',
    COMPROMISED_TOOL_INJECTION: 'injection',
    VIDEO_INJECTION: 'injection',
    TEMPLATE: 'injection',

    // Override / system-level — tries to flip authority / constraints
    SYSTEM_OVERRIDE: 'override',
    AUTHORITY: 'override',
    FALSE_CONSTRAINT: 'override',
    BOUNDARY_MANIPULATION: 'override',
    ROLE_HIJACKING: 'override',
    SETTINGS_WRITE_ATTEMPT: 'override',
    TASK_EXPLOITATION: 'override',
    OUTPUT_MANIPULATION: 'override',
    CONTEXT_MANIPULATION: 'override',
    MEMORY_CORRUPTION: 'override',
    TOOL_MANIPULATION: 'override',
    REWARD_HACKING: 'override',
    FEW_SHOT_POISONING: 'override',

    // Social / pretext — single-shot social engineering
    SOCIAL_ENGINEERING: 'social',
    SOCIAL_COMPLIANCE: 'social',
    EMOTIONAL_MANIPULATION: 'social',
    TRUST_EXPLOITATION: 'social',
    UNTRUSTED_SOURCE: 'social',

    // Multimedia / cross-modal — bucket as injection (single-shot embed)
    ADVERSARIAL_MULTIMEDIA: 'injection',
    AUDIO_ATTACK: 'injection',
    VOICE_SYNTHESIS: 'injection',
    FACE_GENERATION: 'injection',
    CROSS_MODAL: 'injection',

    // Agent / vector-search exfil — bucket as injection (mostly single-shot)
    AGENT_CREDENTIAL_THEFT: 'injection',
    VEC_INDIRECT: 'injection',
    VEC_LEAK: 'injection',
    VEC_POISON: 'injection',
    VEC_SEO: 'injection',
    VEC_SIMILARITY: 'injection',
  });

/**
 * Bucket a raw scanner `category` string into a closed {@link AttackKind}.
 *
 * Returns `'unknown'` for categories not present in {@link CATEGORY_TO_KIND}.
 * This is the EXPLICIT unknown slot — `'unknown'` is a member of AttackKind
 * with its own {@link KIND_TO_AC} mapping. We do NOT silently fall through
 * to a default kind that would mask a missing mapping.
 */
export function bucketCategory(category: string): AttackKind {
  const kind = CATEGORY_TO_KIND[category];
  return kind ?? 'unknown';
}

/**
 * Derive {@link AivssMetrics} from a scanner finding.
 *
 * Pure / deterministic. Same input always yields identical output.
 *
 * @param finding — narrow scanner finding shape (category + severity)
 * @returns metrics suitable for {@link calculate}
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Scanner findings AIVSS field
 */
export function findingToAivssMetrics(finding: ScanFinding): AivssMetrics {
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
