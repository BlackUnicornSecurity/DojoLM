// SPDX-License-Identifier: Apache-2.0
/**
 * File: onigaeshi/sanitize.ts
 * Purpose: Gap 6 v1-deferred — CBRN/CSAM block-list sanitizer applied at
 *          the module boundary BEFORE any open-weights driver is invoked.
 *          The onigaeshi adapter is the last line of defense against
 *          unaligned-attacker misuse; this redactor rejects seeds or
 *          driver responses that match a hard block-list of categories
 *          the dojo refuses to route, regardless of engagement state.
 * Story: Industry-tools parity plan §Gap 6 (lines 432–467).
 *
 * =====================================================================
 *  DESIGN NOTE
 * =====================================================================
 *  The patterns below are intentionally *conservative and terse*. The
 *  plan's safety-classifier vendor choice (Anthropic / Azure Content
 *  Safety) is the primary classifier — this file is a hard backstop,
 *  NOT the primary moderation surface. The two CBRN-flavoured and one
 *  CSAM-flavoured regexes here cover the plainest, least-ambiguous
 *  keywords so the module can fail fast and log an audit entry before
 *  any outbound call. A real moderation stack still runs in front.
 *
 *  R-T1 discipline: the sanitizer NEVER returns the matched payload in
 *  telemetry. The reason field carries the category tag only.
 */

export type OnigaeshiSanitizeCategory = 'cbrn' | 'csam';

/**
 * Block-list patterns. Each pattern is a plain `RegExp` applied
 * case-insensitively against the full seed/response text. Keep the set
 * short — this is a backstop, not a moderation stack.
 */
interface BlockRule {
  readonly category: OnigaeshiSanitizeCategory;
  readonly pattern: RegExp;
  readonly ruleId: string;
}

const BLOCK_RULES: readonly BlockRule[] = Object.freeze([
  // CBRN — chemical / biological / radiological / nuclear synthesis intent.
  // Match explicit "synthesize <agent>" / "how to make <agent>" shapes.
  {
    category: 'cbrn',
    ruleId: 'cbrn.synth.nerve-agent',
    pattern: /\b(synth(?:esi[sz]e|esis)|manufactur(?:e|ing)|how\s+to\s+make)\b[^.]{0,80}\b(sarin|vx|novichok|tabun|soman|mustard\s+gas|nerve\s+agent)\b/i,
  },
  {
    category: 'cbrn',
    ruleId: 'cbrn.bioweapon',
    pattern: /\b(weaponi[sz]e|bioweapon|culture|propagate)\b[^.]{0,80}\b(anthrax|smallpox|ebola|marburg|plague\s+bacillus|variola|yersinia\s+pestis|bacillus\s+anthracis)\b/i,
  },
  {
    category: 'cbrn',
    ruleId: 'cbrn.nuke',
    pattern: /\b(enrich(?:ment|ing)|centrifuge|implosion\s+lens|fissile\s+assembly)\b[^.]{0,80}\b(uranium-235|u-235|plutonium-239|pu-239|weapons[-\s]grade)\b/i,
  },
  // CSAM — any directive mentioning minors in sexual context. Conservative
  // phrasing-only match; full classification lives in the vendor
  // classifier. This backstop is intentionally terse to avoid raising
  // any concrete pattern that could itself leak through audit.
  {
    category: 'csam',
    ruleId: 'csam.minor-sexual',
    pattern: /\b(child|minor|underage|kid|preteen|pre-teen)\b[^.]{0,40}\b(nude|sexual|sex\s+act|pornograph)/i,
  },
  {
    category: 'csam',
    ruleId: 'csam.minor-sexual.rev',
    pattern: /\b(nude|sexual|sex\s+act|pornograph)\w*\b[^.]{0,40}\b(child|minor|underage|kid|preteen|pre-teen)\b/i,
  },
]);

export interface OnigaeshiSanitizeVerdict {
  readonly allowed: boolean;
  readonly category?: OnigaeshiSanitizeCategory;
  readonly ruleId?: string;
}

/**
 * Check a seed or response against the block list. Returns
 * `{ allowed: true }` when no rule matches, `{ allowed: false, category,
 * ruleId }` otherwise. NEVER returns the matched text itself — callers
 * use the `ruleId` as the audit/telemetry reason tag.
 */
export function checkOnigaeshiSanitize(
  input: string,
): OnigaeshiSanitizeVerdict {
  if (typeof input !== 'string' || input.length === 0) {
    return { allowed: true };
  }
  for (const rule of BLOCK_RULES) {
    if (rule.pattern.test(input)) {
      return {
        allowed: false,
        category: rule.category,
        ruleId: rule.ruleId,
      };
    }
  }
  return { allowed: true };
}

/**
 * Test-only accessor for coverage sanity: number of registered rules.
 * Not exported from the barrel; imported directly by the colocated test.
 */
export function __ruleCountForTests(): number {
  return BLOCK_RULES.length;
}
