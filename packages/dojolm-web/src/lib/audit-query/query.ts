// SPDX-License-Identifier: Apache-2.0
/**
 * File: query.ts
 * Purpose: File-backed query layer over the audit log. Wave 6
 *          WAVE6-AUDIT-QUERY-API / ADR-0052.
 *
 * The audit log lives at `<TPI_DATA_DIR>/audit/audit-YYYY-MM-DD.log`
 * (daily, one entry per line) plus size-rotated tails
 * `audit-YYYY-MM-DD.log.<timestamp>`. Every line is a JSON object
 * written by `writeEntry` in `audit-logger.ts`; see ADR-0020 /
 * Story 13.6.
 *
 * Query semantics:
 *   - `since` / `until` — ISO timestamps. Default: last 7 days.
 *     Capped at 30 days to keep query cost bounded — incident
 *     response has a short window.
 *   - `event`           — exact match on `AuditEvent` name.
 *   - `user`            — exact match on `details.user` string.
 *   - `level`           — exact match on `info` | `warn` | `error`.
 *   - `limit` / `offset` — pagination. `limit` defaults to 50,
 *     max 500.
 *
 * Scan order: newest-first. We iterate log files by filename
 * (sorted by embedded date), and within each file scan lines
 * bottom-up. This matches the operator's mental model ("show me
 * the most recent LLM_BUDGET_EXCEEDED") and lets us stop early
 * once `offset + limit` matches are accumulated.
 *
 * Malformed lines are skipped silently — a rotation mid-write or
 * a manual append from an operator should not crash the query.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { resolveDataPath } from '@/lib/runtime-paths'

export interface AuditQueryFilter {
  readonly since?: string
  readonly until?: string
  readonly event?: string
  readonly user?: string
  readonly level?: 'info' | 'warn' | 'error'
  readonly limit?: number
  readonly offset?: number
}

export interface AuditQueryEntry {
  readonly timestamp: string
  readonly level: 'info' | 'warn' | 'error'
  readonly event: string
  readonly details: Record<string, unknown>
}

export interface AuditQueryResult {
  readonly entries: AuditQueryEntry[]
  readonly totalMatched: number
  readonly limit: number
  readonly offset: number
  readonly hasMore: boolean
  readonly since: string
  readonly until: string
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500
const DEFAULT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000
// CR HIGH (Wave 6 review) — readFile loads the whole file into RAM.
// `audit-logger.ts` rotates at 10 MB but operators may grow that
// limit. Cap per-file scan size to prevent an OOM footgun on a
// large rotated tail. Files exceeding the cap are skipped (operators
// see fewer historical entries but the API stays alive).
const MAX_FILE_SCAN_BYTES = 32 * 1024 * 1024

function auditDir(): string {
  return resolveDataPath('audit')
}

function parseLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  if (!Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(limit), MAX_LIMIT)
}

function parseOffset(offset: number | undefined): number {
  if (offset === undefined) return 0
  if (!Number.isFinite(offset) || offset < 0) return 0
  return Math.floor(offset)
}

function parseIso(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

/**
 * Narrow the cap: requests outside the 30-day window silently
 * snap to the maximum window ending at the requested `until`.
 */
function clampWindow(since: number, until: number): { since: number; until: number } {
  if (until < since) return { since: until, until: since }
  if (until - since > MAX_LOOKBACK_MS) {
    return { since: until - MAX_LOOKBACK_MS, until }
  }
  return { since, until }
}

/**
 * Filename shape: `audit-YYYY-MM-DD.log` or the rotated variant
 * `audit-YYYY-MM-DD.log.<ms-epoch>`. Returns the date portion or
 * `null` if the filename does not match the expected shape.
 */
function fileDate(name: string): string | null {
  const match = name.match(/^audit-(\d{4}-\d{2}-\d{2})\.log(?:\.\d+)?$/)
  return match === null ? null : match[1]
}

interface ScanContext {
  readonly filter: AuditQueryFilter
  readonly sinceMs: number
  readonly untilMs: number
}

function matches(entry: AuditQueryEntry, ctx: ScanContext): boolean {
  const ts = Date.parse(entry.timestamp)
  if (!Number.isFinite(ts)) return false
  if (ts < ctx.sinceMs || ts > ctx.untilMs) return false
  if (ctx.filter.event !== undefined && entry.event !== ctx.filter.event) return false
  if (ctx.filter.level !== undefined && entry.level !== ctx.filter.level) return false
  if (ctx.filter.user !== undefined) {
    const entryUser = entry.details?.user
    if (typeof entryUser !== 'string' || entryUser !== ctx.filter.user) return false
  }
  return true
}

function parseLine(line: string): AuditQueryEntry | null {
  const trimmed = line.trim()
  if (trimmed.length === 0) return null
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed === null || typeof parsed !== 'object') return null
    const record = parsed as Partial<AuditQueryEntry>
    if (
      typeof record.timestamp !== 'string'
      || typeof record.event !== 'string'
      || (record.level !== 'info' && record.level !== 'warn' && record.level !== 'error')
    ) return null
    const details = record.details !== null && typeof record.details === 'object'
      ? record.details as Record<string, unknown>
      : {}
    return {
      timestamp: record.timestamp,
      level: record.level,
      event: record.event,
      details,
    }
  } catch {
    return null
  }
}

/**
 * Find candidate log files in `auditDir()` that overlap the
 * `[since, until]` window. Files are identified by embedded date;
 * rotated files for the same day are included.
 */
async function candidateFiles(sinceMs: number, untilMs: number): Promise<string[]> {
  const dir = auditDir()
  if (!existsSync(dir)) return []
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  const sinceDate = new Date(sinceMs).toISOString().slice(0, 10)
  const untilDate = new Date(untilMs).toISOString().slice(0, 10)
  const filtered = entries
    .map((name) => ({ name, date: fileDate(name) }))
    .filter((f): f is { name: string; date: string } =>
      f.date !== null && f.date >= sinceDate && f.date <= untilDate)
  // Within a same-day cohort: the current (un-rotated) file has no
  // numeric suffix and holds the NEWEST writes; rotated tails carry
  // `.<epoch>` where higher = newer (rotation happens as the current
  // file fills, so later rotations hold later data). Sort current
  // first, then descending numeric suffix.
  filtered.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return rotationRank(b.name) - rotationRank(a.name)
  })
  return filtered.map((f) => path.join(dir, f.name))
}

function rotationRank(name: string): number {
  const m = name.match(/\.log\.(\d+)$/)
  return m === null ? Number.POSITIVE_INFINITY : Number(m[1])
}

/**
 * Query the audit log against the provided filter. Returns
 * newest-first entries within the clamped window. Scans stop
 * early once the caller's pagination need is satisfied.
 */
export async function queryAuditLog(filter: AuditQueryFilter): Promise<AuditQueryResult> {
  const limit = parseLimit(filter.limit)
  const offset = parseOffset(filter.offset)
  const now = Date.now()
  const untilRaw = parseIso(filter.until, now)
  const sinceRaw = parseIso(filter.since, untilRaw - DEFAULT_LOOKBACK_MS)
  const { since: sinceMs, until: untilMs } = clampWindow(sinceRaw, untilRaw)

  const ctx: ScanContext = { filter, sinceMs, untilMs }
  const files = await candidateFiles(sinceMs, untilMs)

  const matched: AuditQueryEntry[] = []
  let totalMatched = 0

  for (const file of files) {
    let raw: string
    try {
      const st = await stat(file)
      if (st.size > MAX_FILE_SCAN_BYTES) {
        // Skip rather than partial-read — a partial read from the
        // wrong end of a large file produces silently-misleading
        // pagination. Operators who need older data should rotate
        // the file or shrink the lookback window.
        console.warn(
          `[audit-query] skipping ${path.basename(file)} (${st.size} bytes > ${MAX_FILE_SCAN_BYTES} cap)`,
        )
        continue
      }
      raw = await readFile(file, 'utf-8')
    } catch {
      continue
    }
    // Lines are appended in chronological order; bottom-up gives
    // newest-first within the file.
    const lines = raw.split('\n')
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const entry = parseLine(lines[i])
      if (entry === null) continue
      if (!matches(entry, ctx)) continue
      totalMatched += 1
      if (totalMatched > offset && matched.length < limit) {
        matched.push(entry)
      }
    }
  }

  return {
    entries: matched,
    totalMatched,
    limit,
    offset,
    hasMore: totalMatched > offset + matched.length,
    since: new Date(sinceMs).toISOString(),
    until: new Date(untilMs).toISOString(),
  }
}
