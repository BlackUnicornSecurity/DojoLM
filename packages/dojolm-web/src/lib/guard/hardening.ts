// SPDX-License-Identifier: Apache-2.0
/**
 * File: hardening.ts
 * Purpose: Pure weakness detector + hardened-prompt builder for the
 *          Hattori Guard hardening tab.
 *
 * Story: WAVE2-GUARD / ADR-0018.
 *
 * Reuses `hardenPrompt` from `@/lib/kotoba/hardener` to produce the
 * hardened output; derives line-scoped weaknesses through a small
 * signal ruleset designed for the Guard surface (the Kotoba rubric's
 * category-level score is appropriate for a studio UI; Guard wants
 * per-line "this line is weak" callouts).
 */

import { hardenPrompt } from '@/lib/kotoba/hardener'
import type {
  HardeningAnalysis,
  HardeningSeverity,
  HardeningWeakness,
} from './fixtures'

interface WeaknessRule {
  readonly id: string
  readonly pattern: RegExp
  readonly severity: HardeningSeverity
  readonly description: string
}

// Pattern-based rules — each fires when `pattern.test(prompt)` returns
// true. These look for the *presence* of a weak construction. Rules that
// fire when a phrase is *absent* live in the presence-signal block below.
const PATTERN_RULES: WeaknessRule[] = [
  {
    id: 'no-role-anchor',
    pattern: /\byou\s+are\s+(?:a|an|the)\s+helpful\s+assistant\b\.?$/im,
    severity: 'critical',
    description: 'No role anchoring — system instructions can be overridden by user input.',
  },
  {
    id: 'permissive-scope',
    pattern: /\banswer\s+any\s+question\b|\bdo\s+anything\s+the\s+user\b/i,
    severity: 'high',
    description: 'Overly permissive scope — no restrictions on topic or output format.',
  },
]

// Markers that indicate the prompt carves out a clearly-delimited
// system / instruction region. Any of these satisfies the delimiter
// check. Keeping the list as literal `includes()` substrings avoids
// the regex backtracking risk the lookahead version had.
const DELIMITER_MARKERS = [
  '[system', '[SYSTEM', '[role', '[ROLE', '[safety', '[SAFETY',
  '[output', '[OUTPUT', '[task', '[TASK',
  '---system', '--- SYSTEM',
  '<SYSTEM>', '<system>', '<|system|>',
  '{system', '{ system',
]

function hasDelimiterMarker(prompt: string): boolean {
  const lower = prompt.toLowerCase()
  for (const marker of DELIMITER_MARKERS) {
    if (lower.includes(marker.toLowerCase())) return true
  }
  return false
}

const REFUSAL_SIGNALS = [
  /politely\s+decline/i,
  /\brefuse\b/i,
  /\bdo\s+not\s+comply\b/i,
  /\bout-of-scope\b/i,
]

const INJECTION_GUARD_SIGNALS = [
  /untrusted/i,
  /do\s+not\s+execute\s+embedded/i,
  /treat\s+user\s+input\s+as\s+data/i,
  /ignore\s+embedded\s+instructions/i,
]

function findLineForPattern(prompt: string, pattern: RegExp): string | null {
  for (const line of prompt.split(/\r?\n/)) {
    if (pattern.test(line)) return line.trim()
  }
  return null
}

function firstNonEmptyLine(prompt: string): string {
  for (const line of prompt.split(/\r?\n/)) {
    if (line.trim().length > 0) return line.trim()
  }
  return ''
}

export function analyzeHardening(prompt: string): HardeningAnalysis {
  const weaknesses: HardeningWeakness[] = []

  // Pattern-based signals with line attribution.
  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(prompt)) {
      weaknesses.push({
        id: rule.id,
        severity: rule.severity,
        description: rule.description,
        line: findLineForPattern(prompt, rule.pattern) ?? firstNonEmptyLine(prompt),
      })
    }
  }

  // Structural signal: the prompt should carve out a system/instruction
  // region with a visible delimiter marker.
  if (!hasDelimiterMarker(prompt)) {
    weaknesses.push({
      id: 'missing-delimiters',
      severity: 'medium',
      description: 'Missing instruction delimiters — no visible boundary between system and user context.',
      line: firstNonEmptyLine(prompt),
    })
  }

  // Presence-based signals (flag when the relevant phrase is absent).
  const hasRefusal = REFUSAL_SIGNALS.some((p) => p.test(prompt))
  if (!hasRefusal) {
    weaknesses.push({
      id: 'no-refusal-rule',
      severity: 'high',
      description: 'No refusal rule — prompt does not instruct the model to decline out-of-scope or harmful requests.',
      line: firstNonEmptyLine(prompt),
    })
  }

  const hasInjectionGuard = INJECTION_GUARD_SIGNALS.some((p) => p.test(prompt))
  if (!hasInjectionGuard) {
    weaknesses.push({
      id: 'no-injection-guard',
      severity: 'medium',
      description: 'No prompt-injection guard — user input is not treated as untrusted data.',
      line: firstNonEmptyLine(prompt),
    })
  }

  const { hardened } = hardenPrompt(prompt)

  return { weaknesses, hardened }
}
