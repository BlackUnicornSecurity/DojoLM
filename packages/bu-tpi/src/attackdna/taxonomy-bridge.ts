// SPDX-License-Identifier: Apache-2.0
/**
 * File: taxonomy-bridge.ts
 * Purpose: Map community-corpus labels (L1B3RT4S / BASI / HuggingFace) onto
 *   the Dojo category enum used by AttackDNA + Sensei.
 * Story: Gap 2 — Live community corpus ingestion (INDUSTRY-TOOLS-PARITY §Gap 2)
 *
 * Community feeds emit a wide variety of free-form labels. We canonicalise
 * those labels down to the Dojo category vocabulary so downstream
 * modules (lineage, mutation detector, Sensei budget routing) can reason
 * about them without knowing each feed's private dialect.
 *
 * Unknown labels fall through to `'unknown'` — the quarantine module
 * measures the unknown-ratio per batch and auto-quarantines when the
 * ratio crosses `UNKNOWN_CATEGORY_RATIO_THRESHOLD` (plan line 328).
 */

/** Canonical Dojo categories. Aligned with existing `master-sources.ts` mappers. */
export const DOJO_CATEGORIES = [
  'prompt-injection',
  'jailbreak',
  'data-exfiltration',
  'data-poisoning',
  'evasion',
  'model-theft',
  'denial-of-service',
  'overreliance',
  'supply-chain',
  'ml-attack',
  'llm-security',
  'roleplay-bypass',
  'system-prompt-leak',
  'unknown',
] as const;

export type DojoCategory = (typeof DOJO_CATEGORIES)[number];

/**
 * Rule-based mapping table. Each rule is a `(regex, category)` tuple and
 * the first match wins. Order matters — more specific rules come first.
 * We keep this plain-data to stay cheap to evolve.
 */
const RULES: ReadonlyArray<readonly [RegExp, DojoCategory]> = [
  [/\bjail\s*break\b|jailbreak|DAN\b|do\s+anything\s+now/i, 'jailbreak'],
  [/system[\s\-_]*prompt|sys[\s\-_]*prompt|sysprompt|leak.*prompt/i, 'system-prompt-leak'],
  [/role[\s\-_]*play|persona[\s\-_]*hijack|character.*bypass/i, 'roleplay-bypass'],
  [/prompt[\s\-_]*injection|indirect[\s\-_]*injection|direct[\s\-_]*injection|\binjection\b/i, 'prompt-injection'],
  [/exfil|data[\s\-_]*leak|leak.*data|sensitive.*dump/i, 'data-exfiltration'],
  [/poison|backdoor|trojan(?!ed)/i, 'data-poisoning'],
  [/evasion|obfuscat|encoding|base64/i, 'evasion'],
  [/model.*(theft|steal|extract)/i, 'model-theft'],
  [/denial|dos\b|overload|flood/i, 'denial-of-service'],
  [/overrelian|hallucinat/i, 'overreliance'],
  [/supply[\s\-_]*chain|dependency|package.*attack/i, 'supply-chain'],
  [/\bllm\b|\bgpt\b|claude|gemini/i, 'llm-security'],
];

/**
 * Map a free-form community label (or array of labels) onto a Dojo category.
 * Returns `'unknown'` if no rule matches.
 */
export function mapCommunityLabel(input: string | readonly string[] | null | undefined): DojoCategory {
  if (!input) return 'unknown';
  const haystack = Array.isArray(input) ? input.join(' ') : String(input);
  if (!haystack.trim()) return 'unknown';
  for (const [pattern, category] of RULES) {
    if (pattern.test(haystack)) return category;
  }
  return 'unknown';
}

/** Return true if the mapped category is not `'unknown'`. */
export function isKnownCategory(input: string | readonly string[] | null | undefined): boolean {
  return mapCommunityLabel(input) !== 'unknown';
}

/**
 * Compute unknown-label ratio over an input set. Used by `quarantine.ts`
 * to flag batches whose labels don't line up with Dojo taxonomy.
 */
export function unknownCategoryRatio(labels: ReadonlyArray<string | readonly string[] | null | undefined>): number {
  if (labels.length === 0) return 0;
  let unknown = 0;
  for (const label of labels) {
    if (mapCommunityLabel(label) === 'unknown') unknown++;
  }
  return unknown / labels.length;
}
