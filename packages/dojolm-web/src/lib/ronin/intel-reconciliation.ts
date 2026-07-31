// SPDX-License-Identifier: Apache-2.0
/**
 * File: intel-reconciliation.ts
 * Purpose: Wave 8.2 / ADR-0075 — same-CVE cross-source reconciliation
 *          for the Ronin intelligence corpus.
 *
 * Story: WAVE8-I-SEVERITY-RECONCILIATION.
 *
 * Each intel source (NVD / CISA KEV / FIRST EPSS / MITRE ATLAS) may
 * emit a separate `IntelligenceEntryRecord` for the same underlying
 * CVE. The adapters prefix the id to keep records distinct
 * (NVD → `CVE-*`, KEV → `KEV-CVE-*`, EPSS → `EPSS-CVE-*`).
 *
 * This module groups those records by bare CVE id, rolls up the
 * best-available score from each source, derives a composite
 * severity (CVSS 0-10 with EPSS percentile adjustment), and flags
 * "signal conflict" when the tier spread is wide enough for operators
 * to notice (e.g. NVD says HIGH but EPSS says LOW).
 */

import type { IntelligenceEntryRecord } from './fixtures'

export interface ReconciliationSignal {
  readonly entryId: string
  readonly source: string
  readonly severity: IntelligenceEntryRecord['severity']
  readonly cvssScore?: number
  readonly epssScore?: number
  readonly epssPercentile?: number
}

export interface CveReconciliation {
  readonly cveId: string
  readonly signals: readonly ReconciliationSignal[]
  /** 0-10 composite on the CVSS scale. */
  readonly composite: number
  readonly conflict: boolean
  readonly conflictReason: string | null
}

// ---------------------------------------------------------------------------
// Severity tier arithmetic
// ---------------------------------------------------------------------------

const TIER_ORDER: Record<IntelligenceEntryRecord['severity'], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
}

function tierGap(
  a: IntelligenceEntryRecord['severity'],
  b: IntelligenceEntryRecord['severity'],
): number {
  return Math.abs(TIER_ORDER[a] - TIER_ORDER[b])
}

// ---------------------------------------------------------------------------
// Id normalisation
// ---------------------------------------------------------------------------

const CVE_PATTERN = /CVE-\d{4}-\d{4,}/i

/**
 * Strip the source prefix (NVD records ship as `CVE-YYYY-NNNN` and
 * need no stripping; KEV/EPSS use `KEV-CVE-...` / `EPSS-CVE-...`).
 * Returns null when the id does not reference a CVE (ai-incident,
 * ATLAS case studies, etc.).
 */
export function normalizeCveId(id: string): string | null {
  const match = id.match(CVE_PATTERN)
  return match ? match[0].toUpperCase() : null
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export function groupByCveId(
  entries: readonly IntelligenceEntryRecord[],
): Map<string, readonly IntelligenceEntryRecord[]> {
  const out = new Map<string, readonly IntelligenceEntryRecord[]>()
  for (const entry of entries) {
    const cve = normalizeCveId(entry.id)
    if (!cve) continue
    out.set(cve, [...(out.get(cve) ?? []), entry])
  }
  return out
}

// ---------------------------------------------------------------------------
// Per-group reconciliation
// ---------------------------------------------------------------------------

function asSignal(entry: IntelligenceEntryRecord): ReconciliationSignal {
  return {
    entryId: entry.id,
    source: entry.source,
    severity: entry.severity,
    ...(typeof entry.cvssScore === 'number' ? { cvssScore: entry.cvssScore } : {}),
    ...(typeof entry.epssScore === 'number' ? { epssScore: entry.epssScore } : {}),
    ...(typeof entry.epssPercentile === 'number'
      ? { epssPercentile: entry.epssPercentile }
      : {}),
  }
}

/**
 * Composite on the 0-10 CVSS scale.
 *
 * - When a CVSS base score is present we anchor on it.
 * - EPSS percentile adds up to +1.5 of "real-world exploitability"
 *   weight on top of the CVSS base.
 * - When only EPSS is available, scale percentile to 0-10.
 * - When neither is present, fall back to the max severity tier.
 */
function computeComposite(signals: readonly ReconciliationSignal[]): number {
  let maxCvss: number | undefined
  let maxEpssPercentile: number | undefined
  let maxTier = 0
  for (const s of signals) {
    if (typeof s.cvssScore === 'number'
        && (maxCvss === undefined || s.cvssScore > maxCvss)) {
      maxCvss = s.cvssScore
    }
    if (typeof s.epssPercentile === 'number'
        && (maxEpssPercentile === undefined || s.epssPercentile > maxEpssPercentile)) {
      maxEpssPercentile = s.epssPercentile
    }
    const tier = TIER_ORDER[s.severity]
    if (tier > maxTier) maxTier = tier
  }
  const round1 = (x: number) => Math.round(x * 10) / 10
  if (maxCvss !== undefined) {
    const uplift = maxEpssPercentile !== undefined ? maxEpssPercentile * 1.5 : 0
    return Math.min(10, round1(maxCvss + uplift))
  }
  if (maxEpssPercentile !== undefined) {
    return round1(maxEpssPercentile * 10)
  }
  // Severity-only fallback: CRITICAL → 9.0, HIGH → 7.0, MEDIUM → 5.0,
  // LOW → 3.0, INFO → 1.0 (matches the common CVSS-to-tier mapping).
  const byTier = [1.0, 3.0, 5.0, 7.0, 9.0]
  return byTier[maxTier] ?? 0
}

/**
 * Conflict is flagged when any two signals in the group sit at least
 * two severity tiers apart (e.g. HIGH vs LOW, CRITICAL vs MEDIUM).
 * Single-source groups never conflict.
 */
function detectConflict(
  signals: readonly ReconciliationSignal[],
): { conflict: boolean; reason: string | null } {
  if (signals.length < 2) return { conflict: false, reason: null }
  let worst: { a: ReconciliationSignal; b: ReconciliationSignal; gap: number } | null = null
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const a = signals[i]
      const b = signals[j]
      const gap = tierGap(a.severity, b.severity)
      if (gap >= 2 && (!worst || gap > worst.gap)) {
        worst = { a, b, gap }
      }
    }
  }
  if (!worst) return { conflict: false, reason: null }
  return {
    conflict: true,
    reason: `${worst.a.source} rates ${worst.a.severity}; ${worst.b.source} rates ${worst.b.severity}.`,
  }
}

export function reconcileGroup(
  group: readonly IntelligenceEntryRecord[],
): CveReconciliation {
  if (group.length === 0) {
    throw new Error('reconcileGroup called with an empty group')
  }
  const cve = normalizeCveId(group[0].id)
  if (!cve) {
    throw new Error(
      `reconcileGroup called with a group whose first entry (${group[0].id}) has no CVE id`,
    )
  }
  const signals = group.map(asSignal)
  const composite = computeComposite(signals)
  const { conflict, reason } = detectConflict(signals)
  return {
    cveId: cve,
    signals,
    composite,
    conflict,
    conflictReason: reason,
  }
}

/**
 * Build a reconciliation lookup indexed by the normalized CVE id.
 * Entries that don't reference a CVE are skipped. Entries whose
 * group has only one member are included — they still benefit from
 * the composite score, but `conflict` will be false.
 */
export function buildReconciliationIndex(
  entries: readonly IntelligenceEntryRecord[],
): Map<string, CveReconciliation> {
  const groups = groupByCveId(entries)
  const out = new Map<string, CveReconciliation>()
  for (const [cveId, group] of groups) {
    out.set(cveId, reconcileGroup(group))
  }
  return out
}
