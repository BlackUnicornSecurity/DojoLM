/**
 * File: api/sengoku/runs/[runId]/route.ts
 * Purpose: Get run status with progress (D4.4 polling endpoint)
 * Story: DAITENGUYAMA D4.4
 *
 * GET /api/sengoku/runs/[runId] — Get current run status & progress
 *
 * Reads from disk-based run files (written by D4.2 campaign run route).
 * When run is still "running", derives progress from skillResults count vs
 * total skills. This lets the dashboard poll for real-time progress.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import type { CampaignRun } from '@/lib/sengoku-types'
import { getDataPath } from '@/lib/runtime-paths'

const SAFE_ID = /^[\w-]{1,128}$/
const RUNS_DIR = getDataPath('sengoku', 'runs')

async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    return null
  }
}

function safeResolveRun(runId: string): string | null {
  if (!SAFE_ID.test(runId)) return null
  // Run files are stored flat OR under campaignId subdirs.
  // Search both patterns: runs/{runId}.json and runs/*/{runId}.json
  const flatPath = path.resolve(RUNS_DIR, `${runId}.json`)
  if (flatPath.startsWith(path.resolve(RUNS_DIR) + path.sep)) return flatPath
  return null
}

async function findRunFile(runId: string): Promise<string | null> {
  // First try flat path
  const flatPath = safeResolveRun(runId)
  if (flatPath) {
    try {
      await fs.access(flatPath)
      return flatPath
    } catch { /* not found flat */ }
  }

  // Then search campaign subdirs: runs/{campaignId}/{runId}.json
  try {
    const entries = await fs.readdir(RUNS_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || !SAFE_ID.test(entry.name)) continue
      const subPath = path.resolve(RUNS_DIR, entry.name, `${runId}.json`)
      if (!subPath.startsWith(path.resolve(RUNS_DIR) + path.sep)) continue
      try {
        await fs.access(subPath)
        return subPath
      } catch { /* not in this subdir */ }
    }
  } catch { /* RUNS_DIR doesn't exist yet */ }

  return null
}

export const GET = createApiHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ runId: string }> },
  ) => {
    const { runId } = await params

    if (!runId || !SAFE_ID.test(runId)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 })
    }

    const filePath = await findRunFile(runId)
    if (!filePath) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const run = await readJSON<CampaignRun>(filePath)
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Derive progress for UI polling
    const completedSkills = run.skillResults.filter(
      (r) => r.status === 'success' || r.status === 'failure' || r.status === 'error',
    ).length
    const totalSkills = Math.max(run.skillResults.length, 1)
    const progress = run.status === 'completed'
      ? 100
      : run.status === 'failed'
        ? completedSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0
        : Math.round((completedSkills / totalSkills) * 100)

    const currentSkill = run.skillResults.length > completedSkills
      ? run.skillResults[completedSkills]?.skillId ?? null
      : null

    return NextResponse.json({
      run: {
        id: run.id,
        campaignId: run.campaignId,
        status: run.status,
        progress,
        startedAt: run.startedAt,
        completedAt: run.endedAt,
        findingsCount: run.findingsSummary.total,
        currentSkill,
      },
    })
  },
  { rateLimit: 'read' },
)
