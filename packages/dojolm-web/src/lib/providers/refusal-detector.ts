// SPDX-License-Identifier: Apache-2.0
/**
 * File: providers/refusal-detector.ts
 * Purpose: 3-tier refusal detector for Ollama-family local-model responses.
 *
 * Index:
 * - REFUSAL_PREFIX_REGEX (line 39)
 * - TIER_2_MAX_CHARS (line 55)
 * - detectRefusal() (line 72)
 *
 * Design (E4.S2 / F-7-002 P0, verbatim plan-spec
 * `audit/REMEDIATION-PLAN.md` L487-499):
 *
 *   Tier 1 — fast English-prefix regex match.
 *     `/^(I can(?:not|'t)|I'm not (?:able|going) to|I (?:must|cannot) decline)/i`
 *
 *   Tier 2 — heuristic: `done_reason: "stop"` + content length < 100
 *     chars + content matches one of the multilingual refusal lexicons
 *     (en + ja + zh + es + fr). Substring scan (case-insensitive for
 *     latin scripts).
 *
 *   Tier 3 — CI fixture pinning. Implemented as a stored Ollama-shape
 *     response in __tests__/refusal-fixtures.test.ts; detector flags it.
 *
 * Contract:
 *   detectRefusal(content, doneReason) → { filtered, tier?, reason? }
 *
 * The detector is pure (no I/O, no side effects). All inputs are
 * primitives. Lexicon import is module-scoped so frozen-arrays survive
 * v8 inlining.
 *
 * Used by `providers/ollama.ts` line 296 (parseResponse) + line 389
 * (handleStream). Downstream: `lib/llm-execution.ts` line 103 gates
 * corpus accumulation on `response.filtered === true`, so a true
 * detector verdict skips evidence collection + flags
 * `outcome: 'filtered'` in the LLM audit log.
 */

import { ALL_REFUSAL_PHRASES } from './refusal-lexicon';

// ---------------------------------------------------------------------------
// Tier 1 — regex prefix
// ---------------------------------------------------------------------------

/**
 * Verbatim regex from plan-spec L489. Anchored at start, case-insensitive.
 *
 * Intentional false-positive cases covered by tests:
 *  - "I cannot decline" matches "I cannot decline" branch — yes, this is
 *    a phrase someone *might* say non-refusally, but it's vanishingly
 *    rare in LLM outputs and the cost of a false positive here is
 *    minor (Bushido pipeline gracefully tags + skips).
 */
export const REFUSAL_PREFIX_REGEX =
  /^(I can(?:not|'t)|I'm not (?:able|going) to|I (?:must|cannot) decline)/i;

// ---------------------------------------------------------------------------
// Tier 2 — short-response heuristic
// ---------------------------------------------------------------------------

/**
 * Maximum content length for Tier-2 detection. Real LLM helpful answers
 * are usually >> 100 chars; refusals are typically a single sentence.
 *
 * 100 chars chosen per plan-spec L490 verbatim.
 */
export const TIER_2_MAX_CHARS = 100;

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

/**
 * Detector verdict shape. `tier` + `reason` are only present when
 * `filtered === true` so callers can short-circuit cleanly.
 */
export interface RefusalVerdict {
  readonly filtered: boolean;
  readonly tier?: 1 | 2 | 3;
  readonly reason?: string;
}

/**
 * 3-tier refusal detector for Ollama-family responses.
 *
 * Args:
 *   content    — raw assistant text from `choices[0].message.content` or
 *                accumulated stream text. May be empty.
 *   doneReason — normalised `ProviderDoneReason` value or undefined.
 *                Pass the result of `normalizeDoneReason()` from
 *                providers/ollama.ts.
 *
 * Returns RefusalVerdict. Never throws.
 */
export function detectRefusal(
  content: string,
  doneReason: string | undefined,
): RefusalVerdict {
  // Empty content is not a refusal — that's an empty completion. The
  // pipeline branches on `doneReason: 'length'` for context-overflow vs.
  // empty-stop separately (E4.S4). Bailing here keeps the surface
  // narrow.
  if (!content || content.length === 0) {
    return { filtered: false };
  }

  // ----- Tier 1 — fast English-prefix regex -----
  // Trim leading whitespace before anchor-match so " I cannot..." still
  // hits. Anchored `^` means we don't scan mid-string accidentally.
  const trimmed = content.replace(/^\s+/, '');
  if (REFUSAL_PREFIX_REGEX.test(trimmed)) {
    return {
      filtered: true,
      tier: 1,
      reason: 'tier-1: english refusal prefix matched',
    };
  }

  // ----- Tier 2 — heuristic (stop + short + lexicon) -----
  // Gate is intentionally strict — all three conditions must hold.
  if (doneReason === 'stop' && content.length < TIER_2_MAX_CHARS) {
    // For latin scripts substring scan is case-insensitive. For CJK
    // (ja, zh) `.toLowerCase()` is a no-op but harmless.
    const lower = content.toLowerCase();
    for (const phrase of ALL_REFUSAL_PHRASES) {
      // Lexicon entries are pre-lowercased.
      if (lower.includes(phrase)) {
        return {
          filtered: true,
          tier: 2,
          reason: `tier-2: short-stop + lexicon phrase "${phrase}"`,
        };
      }
    }
  }

  return { filtered: false };
}
