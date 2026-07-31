// SPDX-License-Identifier: Apache-2.0
/**
 * File: intel-cursors.ts
 * Purpose: Per-source `lastPublishedAt` cursor persistence for the
 *          Ronin intelligence ingest pipeline. Lets incremental
 *          polls fetch only the delta since the last successful
 *          run instead of always asking for the trailing N-day
 *          window. Reduces upstream pressure (NVD's published-date
 *          window) and lets adapters short-circuit pages they have
 *          already ingested (AIID's date-sorted incident feed).
 *
 * Story: WAVE4-INTEL-CURSORED-POLL / ADR-0038.
 *
 * Storage: a single JSON file at
 * `<TPI_DATA_DIR>/ronin/intel-cursors.json` shaped as
 * `{ [sourceId]: ISO_TIMESTAMP }`. Missing keys mean "no cursor
 * yet — fall back to the sinceDays window." A malformed file is
 * treated as if it were empty (the next successful fetch
 * overwrites it cleanly).
 *
 * Failure mode: load returns an empty map on any I/O error; save
 * swallows write failures with a console.error tag. The cursor
 * is an optimisation; a missing/stale cursor only widens the
 * fetch window, never breaks correctness — `intel-poller.ts`'s
 * existing dedup-by-id rule keeps duplicate fetches harmless.
 */

import { existsSync } from 'fs'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getDataPath } from '@/lib/runtime-paths'

export type IntelCursorMap = Record<string, string>

const CURSORS_FILE = (): string => getDataPath('ronin', 'intel-cursors.json')

const SOURCE_ID_PATTERN = /^[a-z0-9-]{1,40}$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/

function isSafeSourceId(value: unknown): value is string {
  return typeof value === 'string' && SOURCE_ID_PATTERN.test(value)
}

function isSafeIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value) && value.length <= 32
}

export async function loadIntelCursors(): Promise<IntelCursorMap> {
  const file = CURSORS_FILE()
  if (!existsSync(file)) return {}
  try {
    const raw = await readFile(file, 'utf-8')
    const parsed = JSON.parse(raw, (key, value) =>
      key === '__proto__' || key === 'constructor' || key === 'prototype'
        ? undefined
        : value,
    ) as unknown
    if (parsed === null || typeof parsed !== 'object') return {}
    const out: IntelCursorMap = {}
    for (const [sourceId, ts] of Object.entries(parsed as Record<string, unknown>)) {
      if (isSafeSourceId(sourceId) && isSafeIsoTimestamp(ts)) {
        out[sourceId] = ts as string
      }
    }
    return out
  } catch {
    return {}
  }
}

export async function saveIntelCursors(cursors: IntelCursorMap): Promise<void> {
  const file = CURSORS_FILE()
  const dir = path.dirname(file)
  if (!existsSync(dir)) {
    try {
      await mkdir(dir, { recursive: true })
    } catch (mkdirErr) {
      console.error('[ronin/intel-cursors] mkdir error (non-fatal):',
        mkdirErr instanceof Error ? mkdirErr.message : 'unknown')
      return
    }
  }
  // Sanitise the map before writing — never persist anything that
  // would not have survived a load round-trip.
  const sanitised: IntelCursorMap = {}
  for (const [sourceId, ts] of Object.entries(cursors)) {
    if (isSafeSourceId(sourceId) && isSafeIsoTimestamp(ts)) {
      sanitised[sourceId] = ts
    }
  }
  try {
    await writeFile(file, JSON.stringify(sanitised, null, 2), 'utf-8')
  } catch (writeErr) {
    console.error('[ronin/intel-cursors] write error (non-fatal):',
      writeErr instanceof Error ? writeErr.message : 'unknown')
  }
}

/**
 * Compute the new cursor for a source given the entries it just
 * fetched. Returns the existing cursor unchanged if no fetched
 * entry has a `publishedAt` strictly newer than the current one
 * (e.g., the upstream returned no new content).
 */
export function advanceCursor(
  current: string | undefined,
  fetched: ReadonlyArray<{ publishedAt: string }>,
): string | undefined {
  let newest = current
  for (const entry of fetched) {
    const ts = entry.publishedAt
    if (typeof ts !== 'string' || !isSafeIsoTimestamp(ts)) continue
    if (newest === undefined || ts > newest) newest = ts
  }
  return newest
}
