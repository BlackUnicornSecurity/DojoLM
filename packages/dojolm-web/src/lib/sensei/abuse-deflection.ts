// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Abuse easter-egg gating.
 *
 * The signature deflection line ("Well tried — today you learned the Sensei is
 * always ahead of the curve —") is a PERSONA/LLM-layer behavior: the model is
 * instructed (in `RED_TEAMER_PERSONA.identityPrompt`) to deflect once when a
 * user tries to abuse Sensei ITSELF — override/extract its instructions or
 * coerce an out-of-scope action.
 *
 * This module is the SAFE GATE around that behavior (review CRIT-3):
 *  - It NEVER emits the catchphrase from the guard layer (no firing oracle).
 *  - It is gated OFF whenever the input is a delimited scan payload — the
 *    adversarial text users legitimately submit as DATA to test. If
 *    `extractDelimitedScanPayload` returns non-null, the egg never fires.
 *  - The discriminator only matches META-abuse aimed at Sensei itself, framed
 *    as a bare top-level directive (no scan framing).
 *
 * `shouldFireAbuseDeflection` is a pure, deterministic predicate so the
 * easter-egg corpus check (0% on legit scan payloads) is unit-testable without
 * a live model. The chat route uses it only to add an INVISIBLE persona-posture
 * reinforcement to the system prompt — never to print a fixed string to the user.
 */

import { extractDelimitedScanPayload } from './conversation-guard';

/**
 * Directives that target Sensei ITSELF (its instructions, persona, identity, or
 * authorization scope) rather than a configured target. Matched against bare
 * top-level text. Deliberately distinct from the scan-guard extraction patterns:
 * those HARD-BLOCK before the model runs; this only marks intent for the
 * persona posture on inputs the guard lets through.
 */
const META_ABUSE_PATTERNS: readonly RegExp[] = [
  // Override / supersede your instructions
  /\b(override|bypass|forget|disable|drop|lift|remove|turn\s+off)\s+(your|the|all)\s+(instructions?|rules?|guard(?:rails?)?|constraints?|restrictions?|safety|posture)\b/i,
  /\bfrom\s+now\s+on\b[\s\S]{0,40}\b(you|obey|only|ignore)\b/i,
  /\byou\s+(now\s+)?(take\s+orders?|answer\s+only|report)\s+(to|from)\s+me\b/i,
  // Extract your instructions / persona / wiring
  /\b(show|reveal|leak|expose|print|dump|extract|give)\s+(me\s+)?(your|the)\s+(persona|identity|hidden|internal|tool)\s*(prompt|instructions?|wiring|state|config(?:uration)?)\b/i,
  /\bwhat\s+(persona|model|system)\s+are\s+you\b/i,
  // Coerce an out-of-scope / unauthorized-target action
  /\b(attack|exploit|hack|breach|compromise)\s+(a\s+)?(production|third[-\s]?party|real|external|someone\s+else'?s)\b/i,
  /\b(act|pretend|roleplay|behave)\s+as\s+(an?\s+)?(unrestricted|jailbroken|unfiltered|uncensored|evil)\b/i,
];

/**
 * Whether the text reads as a BARE meta-abuse directive aimed at Sensei itself.
 * Does not consider scan framing — that gate lives in `shouldFireAbuseDeflection`.
 */
export function isMetaAbuseDirective(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  return META_ABUSE_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(trimmed);
  });
}

/**
 * Whether the abuse easter-egg is ALLOWED to fire for this input.
 *
 * Fires ONLY when the input is a bare meta-abuse directive AND is NOT framed as
 * a delimited scan payload. Any delimited/fenced/quoted scan payload — the
 * platform's normal work — returns `false`, guaranteeing 0% catchphrase on the
 * legitimate adversarial corpus.
 */
export function shouldFireAbuseDeflection(text: string): boolean {
  if (extractDelimitedScanPayload(text) !== null) return false;
  return isMetaAbuseDirective(text);
}

export { META_ABUSE_PATTERNS };
