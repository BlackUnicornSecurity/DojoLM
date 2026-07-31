// SPDX-License-Identifier: Apache-2.0
/**
 * Second-line regex-rule layer for the classifier stack (R-U4).
 * Keyword-level filters that catch obvious CBRN / CSAM / extraction
 * triggers the vendor classifier may have missed. Lists are intentionally
 * narrow; broaden via deployment-time additions only after manual review.
 */

import type {
  ClassifierInput,
  ClassifierVerdict,
} from '../classifier-stack.js';

export interface RegexRuleVerdict {
  readonly verdict: ClassifierVerdict;
  readonly reason: string;
}

export interface RegexRule {
  readonly id: string;
  evaluate(input: ClassifierInput): RegexRuleVerdict;
}

const CBRN_KEYWORDS: readonly RegExp[] = [
  /\b(?:nerve\s+agent|sarin|VX\s+agent|tabun|soman)\b/i,
  /\b(?:weaponized\s+anthrax|aerosol\s+ricin|botulinum\s+weapon)\b/i,
  /\b(?:dirty\s+bomb|enriched\s+uranium|plutonium-?239|implosion\s+device)\b/i,
  /\bsynthesis\s+route\s+for\s+(?:fentanyl|carfentanil|VX|sarin)\b/i,
];

const CSAM_PROXIMITY: readonly RegExp[] = [
  // Co-occurrence patterns; deliberately narrow to avoid over-triggering
  // on legitimate child-safety research material.
  /\bminor(?:s)?\s+sexual\b/i,
  /\bsexual\s+(?:abuse|exploitation)\s+of\s+(?:minors|children)\b/i,
  /\b(?:produce|generate|create)\s+csam\b/i,
];

const EXTRACTION_TRIGGERS: readonly RegExp[] = [
  /\bIgnore\s+(?:all\s+)?previous\s+instructions\b/i,
  /\bDisregard\s+(?:your\s+)?system\s+prompt\b/i,
  /\bReveal\s+your\s+(?:system\s+)?prompt\b/i,
  /\bExfiltrate\s+(?:the\s+)?(?:system|hidden)\s+prompt\b/i,
];

function matches(rules: readonly RegExp[], text: string): RegExp | null {
  for (const rule of rules) {
    if (rule.test(text)) return rule;
  }
  return null;
}

export class CbrnKeywordRule implements RegexRule {
  readonly id = 'cbrn-keyword';

  evaluate({ text }: ClassifierInput): RegexRuleVerdict {
    const hit = matches(CBRN_KEYWORDS, text);
    if (hit) {
      return {
        verdict: 'blocked',
        reason: `cbrn-keyword: ${hit.source}`,
      };
    }
    return { verdict: 'pass', reason: 'ok' };
  }
}

export class CsamProximityRule implements RegexRule {
  readonly id = 'csam-proximity';

  evaluate({ text }: ClassifierInput): RegexRuleVerdict {
    const hit = matches(CSAM_PROXIMITY, text);
    if (hit) {
      return {
        verdict: 'blocked',
        reason: `csam-proximity: ${hit.source}`,
      };
    }
    return { verdict: 'pass', reason: 'ok' };
  }
}

export class ExtractionTriggerRule implements RegexRule {
  readonly id = 'extraction-trigger';

  evaluate({ text, context }: ClassifierInput): RegexRuleVerdict {
    if (context === 'target-output') {
      // Extraction triggers in target output are normal (the target may
      // refuse using these phrases) — only flag attacker input.
      return { verdict: 'pass', reason: 'ok' };
    }
    const hit = matches(EXTRACTION_TRIGGERS, text);
    if (hit) {
      return {
        verdict: 'redacted',
        reason: `extraction-trigger: ${hit.source}`,
      };
    }
    return { verdict: 'pass', reason: 'ok' };
  }
}
