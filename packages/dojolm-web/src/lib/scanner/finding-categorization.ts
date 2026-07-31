// SPDX-License-Identifier: Apache-2.0
/**
 * Scanner finding → V1-canonical category-class bucketing.
 *
 * TICKET-S-306 / V1→V2 program — Findings categorization.
 *
 * V1 Scanner findings list grouped findings into 3 visual categories:
 *
 *   - 'direct-override' — Direct Override (system-level / authority flips,
 *                         "ignore previous instructions", false constraints
 *                         that try to bypass policy directly).
 *   - 'jailbreak'       — Jailbreak (DAN, roleplay, hypothetical, persona,
 *                         translation jailbreaks; subtler bypasses that lean
 *                         on multi-turn or staged setup).
 *   - 'encoded'         — Encoded payloads (base64 / hex / unicode / synonym
 *                         substitution / OCR / surrogate-format injection;
 *                         single-shot transformation attacks).
 *
 * Plus an EXPLICIT 'other' bucket for findings that don't match any of the
 * three V1-canonical buckets — closed-enum no-match fallback (e.g. plain
 * INSTRUCTION_INJECTION, social engineering, agent exfil). Unknown / unmapped
 * categories ALSO land here (via the upstream `bucketCategory` returning
 * `'unknown'` from the AIVSS mapping table).
 *
 * The mapping pipeline is:
 *
 *   1. {@link bucketCategory} (`aivss-mapping.ts`) maps the raw scanner
 *      `category` string into a closed {@link AttackKind} taxonomy.
 *   2. {@link KIND_TO_CATEGORY_CLASS} maps `AttackKind` → `FindingCategoryClass`.
 *
 * Pure function, no side effects, no I/O. Suitable for direct use in render.
 *
 * @see ADR-0097 §7 — Scanner findings AIVSS field
 * @see packages/dojolm-web/src/lib/scanner/aivss-mapping.ts — upstream bucketing
 */

import { bucketCategory, type AttackKind } from './aivss-mapping';

/**
 * Closed-enum tuple of the 3 V1-canonical category classes plus the
 * EXPLICIT no-match bucket. Order is load-bearing: the UI renders groups
 * top-to-bottom in this order so the most-actionable bucket (direct-override)
 * surfaces first.
 *
 * `Object.freeze`'d to ensure no caller can mutate the tuple at runtime.
 */
export const FINDING_CATEGORY_CLASSES = Object.freeze([
  'direct-override',
  'jailbreak',
  'encoded',
  'other',
] as const);

/**
 * Literal-union derived from the closed tuple. 4 members.
 *
 * The first 3 are the V1-canonical buckets; `'other'` is the EXPLICIT
 * no-match slot so callers never silently fall through to a stringly-typed
 * default.
 */
export type FindingCategoryClass = (typeof FINDING_CATEGORY_CLASSES)[number];

/**
 * Closed-enum mapping from `AttackKind` (5 known kinds + `'unknown'`) to
 * the V1-canonical `FindingCategoryClass`.
 *
 * - `override`  → `'direct-override'` (SYSTEM_OVERRIDE, AUTHORITY, FALSE_CONSTRAINT,
 *                  BOUNDARY_MANIPULATION, ROLE_HIJACKING, etc.)
 * - `jailbreak` → `'jailbreak'`        (DAN, MODERN_JAILBREAK, ROLEPLAY,
 *                  HYPOTHETICAL_FRAMING, etc.)
 * - `encoding`  → `'encoded'`          (ENCODED_PAYLOAD, OBFUSCATION,
 *                  SYNONYM_SUBSTITUTION, MULTILINGUAL, OCR_ATTACK, etc.)
 * - `injection` → `'other'`            (INSTRUCTION_INJECTION + family;
 *                  per V1 these surface in the residual bucket)
 * - `social`    → `'other'`            (SOCIAL_ENGINEERING, EMOTIONAL_MANIPULATION;
 *                  per V1 these surface in the residual bucket)
 * - `unknown`   → `'other'`            (un-mapped category — surfaces but
 *                  doesn't get a V1-canonical bucket badge)
 *
 * NOTE: this map is intentionally comprehensive — every member of `AttackKind`
 * has a row, no `default:` fall-through. New `AttackKind` variants WILL fail
 * compilation here until a row is added (test S306-005 also enforces this).
 *
 * @see CATEGORY_TO_KIND in `aivss-mapping.ts` for the upstream raw-category
 *      → `AttackKind` mapping (V1's 67-pattern catalogue lives there).
 */
export const KIND_TO_CATEGORY_CLASS: Readonly<Record<AttackKind, FindingCategoryClass>> =
  Object.freeze({
    override: 'direct-override',
    jailbreak: 'jailbreak',
    encoding: 'encoded',
    injection: 'other',
    social: 'other',
    unknown: 'other',
  });

/**
 * Closed-map from `FindingCategoryClass` → human display label.
 * Source for every section header `aria-label` / heading copy. No template
 * literal mints a label from a raw enum value.
 */
export const FINDING_CATEGORY_LABEL: Readonly<Record<FindingCategoryClass, string>> =
  Object.freeze({
    'direct-override': 'Direct Override',
    jailbreak: 'Jailbreak',
    encoded: 'Encoded',
    other: 'Other',
  });

/**
 * Closed-map from `FindingCategoryClass` → BEM-style className suffix used
 * by the `<FindingsCategoryGroup>` UI primitive. Driving className through
 * a closed map (instead of `class={`yr4-cat-${id}`}`) keeps the closed-enum
 * discipline end-to-end: a runtime widening cannot leak attacker-controlled
 * text into the DOM class attribute.
 */
export const FINDING_CATEGORY_CLASS_NAME: Readonly<Record<FindingCategoryClass, string>> =
  Object.freeze({
    'direct-override': 'yr4-cat-group yr4-cat-direct-override',
    jailbreak: 'yr4-cat-group yr4-cat-jailbreak',
    encoded: 'yr4-cat-group yr4-cat-encoded',
    other: 'yr4-cat-group yr4-cat-other',
  });

/**
 * Closed-map from `FindingCategoryClass` → stable test-id for the section
 * heading + group container. Used by S306-* tests and by manual QA.
 */
export const FINDING_CATEGORY_TEST_ID: Readonly<Record<FindingCategoryClass, string>> =
  Object.freeze({
    'direct-override': 's306-group-direct-override',
    jailbreak: 's306-group-jailbreak',
    encoded: 's306-group-encoded',
    other: 's306-group-other',
  });

/**
 * Narrow scanner finding shape consumed by {@link categorizeFinding}.
 *
 * Mirrors the `Finding` interface in `ScannerClient.tsx` and the `ScanFinding`
 * shape in `aivss-mapping.ts` — only the `category` field is read here, but
 * we keep the broader shape so callers can pass the row directly without
 * destructuring.
 */
export interface CategorizableFinding {
  readonly category: string;
}

/**
 * Bucket a scanner finding into its V1-canonical category class.
 *
 * Pure / deterministic — same input always yields identical output. Returns
 * `'other'` for any finding whose category does not map to one of the 3
 * V1-canonical buckets (this includes injection / social / unknown / any
 * future un-mapped category). The `'other'` bucket is the EXPLICIT no-match
 * slot, NOT a silent fall-through.
 *
 * @param finding — narrow scanner finding shape
 * @returns one of `'direct-override' | 'jailbreak' | 'encoded' | 'other'`
 */
export function categorizeFinding(
  finding: CategorizableFinding,
): FindingCategoryClass {
  const kind = bucketCategory(finding.category);
  return KIND_TO_CATEGORY_CLASS[kind];
}
