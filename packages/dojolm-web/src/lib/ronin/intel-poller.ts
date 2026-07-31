// SPDX-License-Identifier: Apache-2.0
/**
 * File: intel-poller.ts
 * Purpose: Orchestrate a single polling cycle across configured intel
 *          sources. Merges fetched entries with the existing on-disk
 *          intelligence store under `<TPI_DATA_DIR>/ronin/intelligence`.
 *          Writes a health record so operators / the health endpoint
 *          can see when the last poll ran and what it found.
 *
 * Story: WAVE3-INTEL-INGEST / ADR-0026.
 *
 * Dedup rule: an entry is keyed by its `id` field. If a record with
 * the same id already exists on disk, the newer `publishedAt` wins —
 * otherwise the existing record stays (we don't overwrite manually
 * curated entries with upstream content that hasn't advanced). New
 * ids are created.
 *
 * Non-goals here: scheduling, retries, rate limiting at the source
 * level. The poller runs a single pass and reports what happened.
 * The caller (the admin-only POST route or an external cron) decides
 * when to fire it.
 */

import { existsSync } from 'fs'
import { readFile, readdir, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getDataPath } from '@/lib/runtime-paths'
import type { IntelligenceEntryRecord } from './fixtures'
import {
  DEFAULT_INTEL_SOURCES,
  productionIntelFetcher,
  type IntelSource,
} from './intel-sources'
import { IntelFetchError } from './intel-http'
import {
  loadIntelCursors,
  saveIntelCursors,
  advanceCursor,
  type IntelCursorMap,
} from './intel-cursors'
import { intelPollLatencySeconds, intelPollTotal } from '@/lib/metrics/registry'

function intelDir(): string {
  return getDataPath('ronin', 'intelligence')
}

function healthFile(): string {
  return getDataPath('ronin', 'intelligence-poller-health.json')
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/

export interface PollerSourceResult {
  readonly sourceId: string
  readonly fetched: number
  readonly added: number
  readonly updated: number
  readonly skipped: number
  readonly error: string | null
}

export interface PollerRunResult {
  readonly startedAt: string
  readonly completedAt: string
  readonly totals: {
    readonly fetched: number
    readonly added: number
    readonly updated: number
    readonly skipped: number
    readonly errors: number
  }
  readonly sources: PollerSourceResult[]
}

export interface PollerRunOptions {
  readonly sources?: readonly IntelSource[]
  readonly fetcher?: <T>(url: string) => Promise<T>
  readonly now?: Date
  readonly sinceDays?: number
}

function isSafeEntryId(id: unknown): id is string {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

function isValidEntry(entry: unknown): entry is IntelligenceEntryRecord {
  if (entry === null || typeof entry !== 'object') return false
  const rec = entry as Partial<IntelligenceEntryRecord>
  return (
    isSafeEntryId(rec.id)
    && (rec.type === 'cve' || rec.type === 'ai-incident' || rec.type === 'kev' || rec.type === 'epss' || rec.type === 'atlas')
    && typeof rec.title === 'string'
    && typeof rec.summary === 'string'
    && typeof rec.source === 'string'
    && typeof rec.publishedAt === 'string'
    && Array.isArray(rec.references)
    && Array.isArray(rec.tags)
  )
}

async function loadStored(): Promise<Map<string, IntelligenceEntryRecord>> {
  const dir = intelDir()
  const map = new Map<string, IntelligenceEntryRecord>()
  if (!existsSync(dir)) return map
  const files = await readdir(dir)
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(dir, file), 'utf-8')
      const parsed = JSON.parse(raw) as unknown
      if (isValidEntry(parsed)) {
        map.set(parsed.id, parsed)
      }
    } catch {
      // skip malformed
    }
  }
  return map
}

async function writeEntry(entry: IntelligenceEntryRecord): Promise<void> {
  const dir = intelDir()
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(
    path.join(dir, `${entry.id}.json`),
    JSON.stringify(entry, null, 2),
    'utf-8',
  )
}

async function writeHealth(result: PollerRunResult): Promise<void> {
  const file = healthFile()
  const dir = path.dirname(file)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(file, JSON.stringify(result, null, 2), 'utf-8')
}

export async function readPollerHealth(): Promise<PollerRunResult | null> {
  const file = healthFile()
  if (!existsSync(file)) return null
  try {
    const raw = await readFile(file, 'utf-8')
    return JSON.parse(raw) as PollerRunResult
  } catch {
    return null
  }
}

function mergeFetched(
  stored: Map<string, IntelligenceEntryRecord>,
  fetched: readonly IntelligenceEntryRecord[],
): { readonly toWrite: IntelligenceEntryRecord[]; readonly added: number; readonly updated: number; readonly skipped: number } {
  let added = 0
  let updated = 0
  let skipped = 0
  const toWrite: IntelligenceEntryRecord[] = []
  for (const entry of fetched) {
    if (!isValidEntry(entry)) {
      skipped += 1
      continue
    }
    const existing = stored.get(entry.id)
    if (existing === undefined) {
      toWrite.push(entry)
      added += 1
      continue
    }
    if (entry.publishedAt > existing.publishedAt) {
      toWrite.push(entry)
      updated += 1
      continue
    }
    skipped += 1
  }
  return { toWrite, added, updated, skipped }
}

export async function runPollerOnce(opts: PollerRunOptions = {}): Promise<PollerRunResult> {
  const sources = opts.sources ?? DEFAULT_INTEL_SOURCES
  const fetcher = opts.fetcher ?? productionIntelFetcher
  const now = opts.now ?? new Date()
  const sinceDays = opts.sinceDays ?? 7
  const startedAt = now.toISOString()

  const stored = await loadStored()
  const cursors: IntelCursorMap = await loadIntelCursors()
  let cursorsTouched = false
  const results: PollerSourceResult[] = []
  let grandFetched = 0
  let grandAdded = 0
  let grandUpdated = 0
  let grandSkipped = 0
  let grandErrors = 0

  for (const source of sources) {
    // Wave 6 metrics — per-source latency histogram. Observed even on
    // error so the latency distribution reflects reality (slow-failing
    // sources are a valid operational signal, not a missing data point).
    const sourceStart = Date.now()
    try {
      const fetched = await source.fetchEntries({
        fetcher, now, sinceDays,
        cursor: cursors[source.id],
      })
      const { toWrite, added, updated, skipped } = mergeFetched(stored, fetched)
      // ADR-0038 — advance the per-source cursor to the newest
      // publishedAt seen in this batch. A failed source keeps its
      // existing cursor so a transient outage does not widen the
      // window forever.
      const nextCursor = advanceCursor(cursors[source.id], fetched)
      if (nextCursor !== undefined && nextCursor !== cursors[source.id]) {
        cursors[source.id] = nextCursor
        cursorsTouched = true
      }
      for (const entry of toWrite) {
        try {
          await writeEntry(entry)
          stored.set(entry.id, entry)
        } catch (writeErr) {
          console.error('[ronin/intel-poller] write error (non-fatal):',
            writeErr instanceof Error ? writeErr.message : 'unknown')
        }
      }
      results.push({
        sourceId: source.id,
        fetched: fetched.length,
        added,
        updated,
        skipped,
        error: null,
      })
      grandFetched += fetched.length
      grandAdded += added
      grandUpdated += updated
      grandSkipped += skipped
    } catch (err) {
      const message = err instanceof IntelFetchError
        ? `${err.code}: ${err.message}`
        : err instanceof Error
          ? err.message
          : 'unknown error'
      results.push({
        sourceId: source.id,
        fetched: 0,
        added: 0,
        updated: 0,
        skipped: 0,
        error: message,
      })
      grandErrors += 1
    }
    intelPollLatencySeconds.observe((Date.now() - sourceStart) / 1000, { source: source.id })
  }

  const result: PollerRunResult = {
    startedAt,
    completedAt: new Date().toISOString(),
    totals: {
      fetched: grandFetched,
      added: grandAdded,
      updated: grandUpdated,
      skipped: grandSkipped,
      errors: grandErrors,
    },
    sources: results,
  }

  // Wave 6 metrics — one outcome counter per cycle. `success` when
  // every source completed cleanly, `partial` when at least one
  // source errored but others succeeded, `failed` when every source
  // errored.
  const cycleOutcome = grandErrors === 0
    ? 'success'
    : grandErrors === sources.length
      ? 'failed'
      : 'partial'
  intelPollTotal.inc({ outcome: cycleOutcome })

  try {
    await writeHealth(result)
  } catch (healthErr) {
    console.error('[ronin/intel-poller] health write failed (non-fatal):',
      healthErr instanceof Error ? healthErr.message : 'unknown')
  }

  if (cursorsTouched) {
    await saveIntelCursors(cursors)
  }

  return result
}
