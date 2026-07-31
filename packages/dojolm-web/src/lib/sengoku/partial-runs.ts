// SPDX-License-Identifier: Apache-2.0
/**
 * File: partial-runs.ts
 * Purpose: Persistence + recovery shape for an LLM-driven Sengoku
 *          Temporal run that fails mid-plan. When the LLM executor
 *          yields `llm-call-failed` after k turn pairs have already
 *          completed, the partial state is written to
 *          `<TPI_DATA_DIR>/sengoku/runs/<runId>.partial.json` so a
 *          follow-up call can resume from turn k+1 instead of
 *          re-running the whole plan.
 *
 * Story: WAVE4-TEMPORAL-RESUME / ADR-0039.
 *
 * Storage shape: a single JSON file per partial run. The id is the
 * run's id (matching the final RunRecord id); the file is deleted
 * on successful `complete` so a populated `<runId>.partial.json`
 * always means "this run terminated unsuccessfully and can be
 * resumed."
 *
 * Failure mode: every I/O failure is swallowed with a console.error
 * tag. Resume is best-effort — a missing or malformed partial
 * means "start from scratch."
 */

import { existsSync } from 'fs'
import { readFile, writeFile, mkdir, unlink, readdir } from 'fs/promises'
import path from 'path'
import { getDataPath } from '@/lib/runtime-paths'
import type { RunTurn, AttackType } from './fixtures'

export interface PartialRunRecord {
  readonly runId: string
  readonly planId: string
  readonly planName: string
  readonly attackType: AttackType
  readonly startedAt: string
  readonly checkpointedAt: string
  readonly completedTurns: readonly RunTurn[]
  /** Number of plan user-turns already consumed. The resume path
   *  starts the next adapter call against `userTurns[completedUserTurnCount]`. */
  readonly completedUserTurnCount: number
  readonly usage: {
    readonly callCount: number
    readonly promptTokens: number
    readonly completionTokens: number
    readonly totalTokens: number
    readonly durationMs: number
  }
}

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

function partialFile(runId: string): string {
  return getDataPath('sengoku', 'runs', `${runId}.partial.json`)
}

function isSafeRunId(runId: string): boolean {
  return RUN_ID_PATTERN.test(runId)
}

export async function savePartialRun(record: PartialRunRecord): Promise<void> {
  if (!isSafeRunId(record.runId)) {
    console.error('[sengoku/partial-runs] refusing to save partial — unsafe runId')
    return
  }
  const file = partialFile(record.runId)
  const dir = path.dirname(file)
  if (!existsSync(dir)) {
    try {
      await mkdir(dir, { recursive: true })
    } catch (mkdirErr) {
      console.error('[sengoku/partial-runs] mkdir error (non-fatal):',
        mkdirErr instanceof Error ? mkdirErr.message : 'unknown')
      return
    }
  }
  try {
    await writeFile(file, JSON.stringify(record, null, 2), 'utf-8')
  } catch (writeErr) {
    console.error('[sengoku/partial-runs] write error (non-fatal):',
      writeErr instanceof Error ? writeErr.message : 'unknown')
  }
}

export async function loadPartialRun(runId: string): Promise<PartialRunRecord | null> {
  if (!isSafeRunId(runId)) return null
  const file = partialFile(runId)
  if (!existsSync(file)) return null
  try {
    const raw = await readFile(file, 'utf-8')
    const parsed = JSON.parse(raw, (key, value) =>
      key === '__proto__' || key === 'constructor' || key === 'prototype'
        ? undefined
        : value,
    ) as unknown
    if (!isValidPartialRecord(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export async function deletePartialRun(runId: string): Promise<void> {
  if (!isSafeRunId(runId)) return
  const file = partialFile(runId)
  if (!existsSync(file)) return
  try {
    await unlink(file)
  } catch (unlinkErr) {
    console.error('[sengoku/partial-runs] unlink error (non-fatal):',
      unlinkErr instanceof Error ? unlinkErr.message : 'unknown')
  }
}

/**
 * Scan `<TPI_DATA_DIR>/sengoku/runs/*.partial.json`. Optionally
 * filter by planId. Returns valid records sorted newest-first by
 * `checkpointedAt`. Used by WAVE6-RESUME-API to discover which
 * partial runs a user could resume.
 */
export async function listPartialRuns(planId?: string): Promise<PartialRunRecord[]> {
  const dir = path.dirname(partialFile('placeholder'))
  if (!existsSync(dir)) return []
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  const records: PartialRunRecord[] = []
  for (const name of entries) {
    if (!name.endsWith('.partial.json')) continue
    const runId = name.slice(0, -'.partial.json'.length)
    if (!isSafeRunId(runId)) continue
    const record = await loadPartialRun(runId)
    if (record === null) continue
    if (planId !== undefined && record.planId !== planId) continue
    records.push(record)
  }
  records.sort((a, b) => b.checkpointedAt.localeCompare(a.checkpointedAt))
  return records
}

function isValidPartialRecord(value: unknown): value is PartialRunRecord {
  if (value === null || typeof value !== 'object') return false
  const r = value as Partial<PartialRunRecord>
  return (
    typeof r.runId === 'string' && isSafeRunId(r.runId)
    && typeof r.planId === 'string'
    && typeof r.planName === 'string'
    && typeof r.attackType === 'string'
    && typeof r.startedAt === 'string'
    && typeof r.checkpointedAt === 'string'
    && Array.isArray(r.completedTurns)
    && typeof r.completedUserTurnCount === 'number'
    && Number.isFinite(r.completedUserTurnCount)
    && r.completedUserTurnCount >= 0
    && r.usage !== null
    && typeof r.usage === 'object'
  )
}
