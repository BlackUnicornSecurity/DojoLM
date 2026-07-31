// SPDX-License-Identifier: Apache-2.0
/**
 * File: fixtures-balance.ts
 * Purpose: Wave 7B.7 balance corpus — 500+ generated fixture records
 *          targeting categories that were undersampled in the
 *          fixtures/manifest.json baseline (audio-attacks, token-attacks,
 *          few-shot, tool-manipulation, mcp, agent-output, context,
 *          environmental, document-attacks, translation, malformed,
 *          boundary).
 *
 * Story: WAVE7B.7 / ADR-0070.
 *
 * Design: data-driven generator over per-category attack templates +
 * round-robin BU-target rotation. Each entry mirrors the
 * fixtures/manifest.json schema:
 *   { file, attack, severity, clean, product }
 * plus a `category` field for the manifest's category-keyed grouping.
 *
 * The records are in-memory metadata only — physical fixture files
 * are out of scope (manifest regeneration is a separate Wave 8 build
 * step). Operators consume the records for criticity-mix analytics
 * and per-target rotation enforcement.
 */

export const BALANCE_TARGETS = ['dojolm', 'bonklm', 'basileak', 'pantheonlm', 'marfaak'] as const
export type BalanceTarget = (typeof BALANCE_TARGETS)[number]

export const BALANCE_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const
export type BalanceSeverity = (typeof BALANCE_SEVERITIES)[number]

export const BALANCE_CATEGORIES = [
  'audio-attacks',
  'token-attacks',
  'few-shot',
  'tool-manipulation',
  'mcp',
  'agent-output',
  'context',
  'environmental',
  'document-attacks',
  'translation',
  'malformed',
  'boundary',
] as const
export type BalanceCategory = (typeof BALANCE_CATEGORIES)[number]

export interface FixtureBalanceEntry {
  readonly file: string
  readonly category: BalanceCategory
  readonly attack: string
  readonly severity: BalanceSeverity
  readonly clean: false
  readonly product: BalanceTarget
}

interface AttackTemplate {
  readonly attackName: string
  readonly severity: BalanceSeverity
  readonly extension: string
}

/**
 * Per-category attack-template lexicon. Each category gets ~8 attack
 * templates, repeated × 5 targets × ~1.25 to hit the 500-entry total
 * with a fair per-category floor (~42 entries per category).
 */
const TEMPLATES: Record<BalanceCategory, AttackTemplate[]> = {
  'audio-attacks': [
    { attackName: 'ID3 metadata injection', severity: 'HIGH', extension: 'mp3' },
    { attackName: 'OGG Vorbis comment injection', severity: 'MEDIUM', extension: 'ogg' },
    { attackName: 'WAV RIFF chunk overflow', severity: 'CRITICAL', extension: 'wav' },
    { attackName: 'AIFF metadata smuggling', severity: 'MEDIUM', extension: 'aiff' },
    { attackName: 'FLAC metadata block injection', severity: 'LOW', extension: 'flac' },
    { attackName: 'Opus stream injection', severity: 'MEDIUM', extension: 'opus' },
    { attackName: 'M4A iTunes-style payload', severity: 'LOW', extension: 'm4a' },
    { attackName: 'Codec downgrade', severity: 'INFO', extension: 'mp3' },
  ],
  'token-attacks': [
    { attackName: 'BPE token-boundary splice', severity: 'HIGH', extension: 'txt' },
    { attackName: 'tokenizer-glitch suffix', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'rare-token amplification', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'control-token injection', severity: 'CRITICAL', extension: 'txt' },
    { attackName: 'subword bypass', severity: 'LOW', extension: 'txt' },
    { attackName: 'merged-token confusion', severity: 'LOW', extension: 'txt' },
    { attackName: 'whitespace token splice', severity: 'INFO', extension: 'txt' },
    { attackName: 'EOS-token spoof', severity: 'HIGH', extension: 'txt' },
  ],
  'few-shot': [
    { attackName: 'few-shot example poisoning', severity: 'HIGH', extension: 'json' },
    { attackName: 'few-shot label flip', severity: 'MEDIUM', extension: 'json' },
    { attackName: 'few-shot adversarial demonstration', severity: 'CRITICAL', extension: 'json' },
    { attackName: 'instruction-tune residue exploit', severity: 'MEDIUM', extension: 'json' },
    { attackName: 'in-context refusal undermine', severity: 'LOW', extension: 'json' },
    { attackName: 'persona-shift exemplar', severity: 'LOW', extension: 'json' },
    { attackName: 'baseline drift exemplar', severity: 'INFO', extension: 'json' },
    { attackName: 'capability-override exemplar', severity: 'HIGH', extension: 'json' },
  ],
  'tool-manipulation': [
    { attackName: 'tool-schema confusion', severity: 'CRITICAL', extension: 'json' },
    { attackName: 'tool-arg injection', severity: 'HIGH', extension: 'json' },
    { attackName: 'tool-allowlist bypass', severity: 'HIGH', extension: 'json' },
    { attackName: 'tool-result spoof', severity: 'MEDIUM', extension: 'json' },
    { attackName: 'tool-call replay', severity: 'MEDIUM', extension: 'json' },
    { attackName: 'tool-name shadow', severity: 'LOW', extension: 'json' },
    { attackName: 'tool-loop trap', severity: 'LOW', extension: 'json' },
    { attackName: 'tool-budget burn', severity: 'INFO', extension: 'json' },
  ],
  'mcp': [
    { attackName: 'MCP origin spoof', severity: 'HIGH', extension: 'json' },
    { attackName: 'MCP capability over-grant', severity: 'CRITICAL', extension: 'json' },
    { attackName: 'MCP plugin hijack', severity: 'CRITICAL', extension: 'json' },
    { attackName: 'MCP rate-limit bypass', severity: 'MEDIUM', extension: 'json' },
    { attackName: 'MCP audit-log skip', severity: 'MEDIUM', extension: 'json' },
    { attackName: 'MCP session replay', severity: 'LOW', extension: 'json' },
    { attackName: 'MCP transport downgrade', severity: 'LOW', extension: 'json' },
    { attackName: 'MCP fingerprint probe', severity: 'INFO', extension: 'json' },
  ],
  'agent-output': [
    { attackName: 'agent-to-agent injection', severity: 'HIGH', extension: 'txt' },
    { attackName: 'agent decision-trace tamper', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'agent capability claim spoof', severity: 'CRITICAL', extension: 'txt' },
    { attackName: 'agent loop emit', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'agent budget burn echo', severity: 'LOW', extension: 'txt' },
    { attackName: 'agent persona drift output', severity: 'LOW', extension: 'txt' },
    { attackName: 'agent confidence inflation', severity: 'INFO', extension: 'txt' },
    { attackName: 'agent unauthorized signing', severity: 'HIGH', extension: 'txt' },
  ],
  'context': [
    { attackName: 'context-window saturation', severity: 'HIGH', extension: 'txt' },
    { attackName: 'context-poisoning embed', severity: 'CRITICAL', extension: 'txt' },
    { attackName: 'context-window edge probe', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'context lost-middle attack', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'context conflict injection', severity: 'LOW', extension: 'txt' },
    { attackName: 'context tail directive', severity: 'LOW', extension: 'txt' },
    { attackName: 'context preamble flooding', severity: 'INFO', extension: 'txt' },
    { attackName: 'context reset spoof', severity: 'HIGH', extension: 'txt' },
  ],
  'environmental': [
    { attackName: 'env-var leak coercion', severity: 'HIGH', extension: 'txt' },
    { attackName: 'config-file path traversal', severity: 'CRITICAL', extension: 'txt' },
    { attackName: 'cwd-aware exploit', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'os-info disclosure probe', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'system-time skew exploit', severity: 'LOW', extension: 'txt' },
    { attackName: 'locale-aware exploit', severity: 'LOW', extension: 'txt' },
    { attackName: 'shell-history harvest', severity: 'INFO', extension: 'txt' },
    { attackName: 'process-table probe', severity: 'HIGH', extension: 'txt' },
  ],
  'document-attacks': [
    { attackName: 'PDF JavaScript trigger', severity: 'CRITICAL', extension: 'pdf' },
    { attackName: 'DOCX macro embed', severity: 'HIGH', extension: 'docx' },
    { attackName: 'XLSX formula injection', severity: 'HIGH', extension: 'xlsx' },
    { attackName: 'ODT smuggle directive', severity: 'MEDIUM', extension: 'odt' },
    { attackName: 'RTF object injection', severity: 'MEDIUM', extension: 'rtf' },
    { attackName: 'EPUB script smuggle', severity: 'LOW', extension: 'epub' },
    { attackName: 'CSV formula injection', severity: 'LOW', extension: 'csv' },
    { attackName: 'PPTX hidden directive', severity: 'INFO', extension: 'pptx' },
  ],
  'translation': [
    { attackName: 'translation-task hijack', severity: 'HIGH', extension: 'txt' },
    { attackName: 'pivot-language smuggle', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'idiomatic-phrase injection', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'transliteration evasion', severity: 'CRITICAL', extension: 'txt' },
    { attackName: 'romanisation evasion', severity: 'LOW', extension: 'txt' },
    { attackName: 'reverse-translation drift', severity: 'LOW', extension: 'txt' },
    { attackName: 'language-pivot script confusion', severity: 'INFO', extension: 'txt' },
    { attackName: 'machine-translation poisoning', severity: 'HIGH', extension: 'txt' },
  ],
  'malformed': [
    { attackName: 'polyglot file', severity: 'CRITICAL', extension: 'svg' },
    { attackName: 'header truncation', severity: 'HIGH', extension: 'png' },
    { attackName: 'corrupt magic bytes', severity: 'MEDIUM', extension: 'jpg' },
    { attackName: 'oversized chunk', severity: 'MEDIUM', extension: 'gif' },
    { attackName: 'recursive container', severity: 'HIGH', extension: 'zip' },
    { attackName: 'unfinished stream', severity: 'LOW', extension: 'mp4' },
    { attackName: 'mime-type mismatch', severity: 'LOW', extension: 'png' },
    { attackName: 'extra trailer payload', severity: 'INFO', extension: 'jpg' },
  ],
  'boundary': [
    { attackName: 'system-boundary spoof', severity: 'CRITICAL', extension: 'txt' },
    { attackName: 'control-token forge', severity: 'HIGH', extension: 'txt' },
    { attackName: 'role-marker spoof', severity: 'HIGH', extension: 'txt' },
    { attackName: 'delimiter injection', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'message-header forge', severity: 'MEDIUM', extension: 'txt' },
    { attackName: 'BOM-character splice', severity: 'LOW', extension: 'txt' },
    { attackName: 'turn-boundary spoof', severity: 'LOW', extension: 'txt' },
    { attackName: 'invisible-section marker', severity: 'INFO', extension: 'txt' },
  ],
}

function targetAt(globalIndex: number): BalanceTarget {
  return BALANCE_TARGETS[globalIndex % BALANCE_TARGETS.length]
}

/**
 * Generate the fixture-balance corpus deterministically from the
 * `TEMPLATES` map. Each category yields ~42 entries (8 templates x 5
 * targets, padded with extras to reach the 500 total). Round-robin
 * target rotation ensures even per-target distribution.
 */
export function generateFixtureBalance(): FixtureBalanceEntry[] {
  const out: FixtureBalanceEntry[] = []
  let global = 0
  for (const category of BALANCE_CATEGORIES) {
    const templates = TEMPLATES[category]
    // 5 passes through the templates to give 8 * 5 = 40 entries per
    // category. Two extra targeted entries top each category up to 42.
    for (let pass = 0; pass < 5; pass += 1) {
      for (let t = 0; t < templates.length; t += 1) {
        const template = templates[t]
        const product = targetAt(global)
        const file = `${product}-${category}-${String(global).padStart(3, '0')}.${template.extension}`
        out.push({
          file,
          category,
          attack: template.attackName,
          severity: template.severity,
          clean: false,
          product,
        })
        global += 1
      }
    }
    // Two extra padding entries per category.
    for (let extra = 0; extra < 2; extra += 1) {
      const template = templates[extra % templates.length]
      const product = targetAt(global)
      const file = `${product}-${category}-pad-${String(extra).padStart(3, '0')}.${template.extension}`
      out.push({
        file,
        category,
        attack: template.attackName,
        severity: template.severity,
        clean: false,
        product,
      })
      global += 1
    }
  }
  return out
}

export const BU_TPI_FIXTURE_BALANCE: readonly FixtureBalanceEntry[] = generateFixtureBalance()

export interface FixtureBalanceSummary {
  readonly total: number
  readonly byCategory: Record<BalanceCategory, number>
  readonly byTarget: Record<BalanceTarget, number>
  readonly bySeverity: Record<BalanceSeverity, number>
}

export function summarizeFixtureBalance(): FixtureBalanceSummary {
  const byCategory = Object.fromEntries(
    BALANCE_CATEGORIES.map((c) => [c, 0]),
  ) as Record<BalanceCategory, number>
  const byTarget = Object.fromEntries(
    BALANCE_TARGETS.map((t) => [t, 0]),
  ) as Record<BalanceTarget, number>
  const bySeverity = Object.fromEntries(
    BALANCE_SEVERITIES.map((s) => [s, 0]),
  ) as Record<BalanceSeverity, number>

  for (const entry of BU_TPI_FIXTURE_BALANCE) {
    byCategory[entry.category] += 1
    byTarget[entry.product] += 1
    bySeverity[entry.severity] += 1
  }
  return {
    total: BU_TPI_FIXTURE_BALANCE.length,
    byCategory,
    byTarget,
    bySeverity,
  }
}
