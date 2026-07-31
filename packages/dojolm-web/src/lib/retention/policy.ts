// SPDX-License-Identifier: Apache-2.0
/**
 * File: policy.ts
 * Purpose: Retention / TTL housekeeping for file-backed stores that
 *          grow unbounded. Wave 6 WAVE6-RETENTION-POLICY / ADR-0050.
 *
 * Namespaces covered today:
 *   - `audit`    — `<TPI_DATA_DIR>/audit/audit-*.log*` (daily logs +
 *                  size-rotated tails). Default: 90d.
 *   - `sengoku`  — `<TPI_DATA_DIR>/sengoku/runs/*.json` (final records).
 *                  Default: 30d.
 *   - `partial`  — `<TPI_DATA_DIR>/sengoku/runs/*.partial.json` (crash
 *                  checkpoints). Default: 7d — partials decay fast
 *                  because a resume that is going to happen happens
 *                  quickly, and a week-old partial is almost certainly
 *                  dead weight.
 *   - `intel`    — `<TPI_DATA_DIR>/ronin/intelligence/*.json`. Default:
 *                  180d — intel is useful long-term; operators who
 *                  want shorter can set the env var.
 *
 * Scheduling: no in-process scheduler. Operators invoke the pass via
 * `POST /api/admin/retention/run` (admin-gated) on a cron / systemd
 * timer cadence. Matches the ADR-0026 poller pattern.
 *
 * Failure posture: every unlink failure is counted and surfaced in
 * the result. A per-namespace failure never masks other namespaces
 * — partial success is the normal outcome.
 */

import { readdir, stat, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { getDataPath } from '@/lib/runtime-paths'

export interface RetentionNamespaceResult {
  readonly namespace: string
  readonly scanned: number
  readonly pruned: number
  readonly errors: number
  /** Cutoff ISO timestamp — files older than this were eligible. */
  readonly cutoff: string
  /** TTL applied, in days. */
  readonly days: number
}

export interface RetentionRunResult {
  readonly startedAt: string
  readonly completedAt: string
  readonly namespaces: RetentionNamespaceResult[]
}

export interface RetentionConfig {
  readonly auditDays: number
  readonly sengokuDays: number
  readonly partialDays: number
  readonly intelDays: number
}

const DEFAULT_AUDIT_DAYS = 90
const DEFAULT_SENGOKU_DAYS = 30
const DEFAULT_PARTIAL_DAYS = 7
const DEFAULT_INTEL_DAYS = 180

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

/**
 * Reads retention TTLs from environment. Invalid values fall back to
 * defaults; zero / negative values are treated as "use default" rather
 * than "never prune" to prevent an accidental disabling of the pass.
 * If an operator genuinely wants a namespace exempt, they should skip
 * the namespace in the caller rather than passing a zero here.
 */
export function loadRetentionConfig(): RetentionConfig {
  return {
    auditDays: positiveInt(process.env.TPI_RETENTION_AUDIT_DAYS, DEFAULT_AUDIT_DAYS),
    sengokuDays: positiveInt(process.env.TPI_RETENTION_SENGOKU_DAYS, DEFAULT_SENGOKU_DAYS),
    partialDays: positiveInt(process.env.TPI_RETENTION_PARTIAL_DAYS, DEFAULT_PARTIAL_DAYS),
    intelDays: positiveInt(process.env.TPI_RETENTION_INTEL_DAYS, DEFAULT_INTEL_DAYS),
  }
}

interface PruneSpec {
  readonly namespace: string
  readonly dir: string
  readonly filter: (name: string) => boolean
  readonly days: number
}

/**
 * Prunes files matching `filter` under `dir` whose mtime is older than
 * `days` days ago. Returns counts only — never reveals pruned filenames
 * to the caller (operators reading the audit log should not see
 * user-attributable file identifiers leaked by the retention pass).
 */
async function pruneNamespace(spec: PruneSpec, now: Date): Promise<RetentionNamespaceResult> {
  const cutoffMs = now.getTime() - spec.days * 24 * 60 * 60 * 1000
  const cutoff = new Date(cutoffMs).toISOString()
  const result: RetentionNamespaceResult = {
    namespace: spec.namespace,
    scanned: 0,
    pruned: 0,
    errors: 0,
    cutoff,
    days: spec.days,
  }
  if (!existsSync(spec.dir)) return result
  let entries: string[]
  try {
    entries = await readdir(spec.dir)
  } catch {
    return { ...result, errors: 1 }
  }
  let scanned = 0
  let pruned = 0
  let errors = 0
  for (const name of entries) {
    if (!spec.filter(name)) continue
    scanned += 1
    const full = path.join(spec.dir, name)
    try {
      const st = await stat(full)
      if (!st.isFile()) continue
      if (st.mtimeMs >= cutoffMs) continue
      await unlink(full)
      pruned += 1
    } catch {
      errors += 1
    }
  }
  return { ...result, scanned, pruned, errors }
}

/**
 * Runs retention across every namespace. Each namespace is
 * independent — its own readdir / unlink sequence and its own
 * counts — so the four passes run concurrently to keep operator-
 * triggered sweeps responsive on slow volumes.
 */
export async function runRetention(
  config: RetentionConfig = loadRetentionConfig(),
  clock: () => Date = () => new Date(),
): Promise<RetentionRunResult> {
  const now = clock()
  const startedAt = now.toISOString()

  const auditDir = getDataPath('audit')
  const sengokuDir = getDataPath('sengoku', 'runs')
  const intelDir = getDataPath('ronin', 'intelligence')

  const specs: PruneSpec[] = [
    {
      namespace: 'audit',
      dir: auditDir,
      filter: (name) => name.startsWith('audit-') && (name.endsWith('.log') || /\.log\.\d+$/.test(name)),
      days: config.auditDays,
    },
    {
      namespace: 'sengoku',
      dir: sengokuDir,
      filter: (name) => name.endsWith('.json') && !name.endsWith('.partial.json'),
      days: config.sengokuDays,
    },
    {
      namespace: 'partial',
      dir: sengokuDir,
      filter: (name) => name.endsWith('.partial.json'),
      days: config.partialDays,
    },
    {
      namespace: 'intel',
      dir: intelDir,
      filter: (name) => name.endsWith('.json'),
      days: config.intelDays,
    },
  ]

  // CR MEDIUM (Wave 6 review) — namespaces are independent, so the
  // four scans run in parallel. Result order matches `specs` order
  // so callers (audit emit, route response) stay deterministic.
  const results = await Promise.all(specs.map((spec) => pruneNamespace(spec, now)))

  return {
    startedAt,
    completedAt: clock().toISOString(),
    namespaces: results,
  }
}
