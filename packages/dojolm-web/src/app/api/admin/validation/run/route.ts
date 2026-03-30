/**
 * File: route.ts
 * Purpose: Admin validation run API — POST to trigger a validation run
 * Story: K6.4 (Admin Validation API Routes)
 * Index:
 * - Constants & types (line 14)
 * - Lock file helpers (line 30)
 * - POST handler (line 65)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import crypto from 'node:crypto'
import { withAuth } from '@/lib/auth/route-guard'
import { auditLog } from '@/lib/audit-logger'
import { getDataPath } from '@/lib/runtime-paths'

const DATA_DIR = getDataPath('validation')
const LOCK_PATH = join(DATA_DIR, 'run-lock.json')

/** Lock expiry: 90 minutes — prevents permanent DoS from stale locks */
const LOCK_EXPIRY_MS = 90 * 60 * 1000

/** Safe module ID pattern — prevents path traversal */
const SAFE_MODULE_ID = /^[a-zA-Z0-9_-]{1,128}$/

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

interface RunLock {
  runId: string
  startedAt: string
  modules: string[] | null
  fullCorpus: boolean
  includeHoldout: boolean
}

function readLock(): RunLock | null {
  try {
    const raw = readFileSync(LOCK_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.runId === 'string') {
      // Check lock age — if older than LOCK_EXPIRY_MS, treat as stale
      if (parsed.startedAt) {
        const lockAge = Date.now() - new Date(parsed.startedAt).getTime()
        if (lockAge > LOCK_EXPIRY_MS) {
          try {
            unlinkSync(LOCK_PATH)
          } catch {
            // Best effort cleanup
          }
          return null
        }
      }
      return parsed as RunLock
    }
    return null
  } catch {
    return null
  }
}

function writeLockAtomic(lock: RunLock): void {
  const dir = dirname(LOCK_PATH)
  mkdirSync(dir, { recursive: true })

  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const tmpPath = `${LOCK_PATH}.${uniqueSuffix}.tmp`

  const data = JSON.stringify(lock, null, 2)
  writeFileSync(tmpPath, data, 'utf8')
  renameSync(tmpPath, LOCK_PATH)
}

function writeProgressAtomic(runId: string, progress: Record<string, unknown>): void {
  const runDir = join(DATA_DIR, 'runs', runId)
  mkdirSync(runDir, { recursive: true })

  const progressPath = join(runDir, 'progress.json')
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const tmpPath = `${progressPath}.${uniqueSuffix}.tmp`

  const data = JSON.stringify(progress, null, 2)
  writeFileSync(tmpPath, data, 'utf8')
  renameSync(tmpPath, progressPath)
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // Parse request body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Validate fields
    const ALLOWED_KEYS = new Set(['modules', 'fullCorpus', 'includeHoldout'])
    const unknownKeys = Object.keys(body).filter(k => !ALLOWED_KEYS.has(k))
    if (unknownKeys.length > 0) {
      return NextResponse.json(
        { error: `Unknown fields: ${unknownKeys.join(', ')}` },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Validate modules if provided
    if (body.modules !== undefined) {
      if (!Array.isArray(body.modules)) {
        return NextResponse.json(
          { error: 'modules must be an array of strings' },
          { status: 400, headers: SECURITY_HEADERS }
        )
      }
      for (const m of body.modules) {
        if (typeof m !== 'string' || !SAFE_MODULE_ID.test(m)) {
          return NextResponse.json(
            { error: 'Each module must match /^[a-zA-Z0-9_-]{1,128}$/' },
            { status: 400, headers: SECURITY_HEADERS }
          )
        }
      }
    }

    // Validate fullCorpus
    if (body.fullCorpus !== undefined && typeof body.fullCorpus !== 'boolean') {
      return NextResponse.json(
        { error: 'fullCorpus must be a boolean' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Validate includeHoldout
    if (body.includeHoldout !== undefined && typeof body.includeHoldout !== 'boolean') {
      return NextResponse.json(
        { error: 'includeHoldout must be a boolean' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Check for existing running validation (rate limiting via lock file)
    const existingLock = readLock()
    if (existingLock) {
      return NextResponse.json(
        { error: 'A validation run is already in progress', runId: existingLock.runId },
        { status: 429, headers: SECURITY_HEADERS }
      )
    }

    // Create run
    const runId = crypto.randomUUID()
    const now = new Date().toISOString()
    const modules = (body.modules as string[] | undefined) ?? null
    const fullCorpus = (body.fullCorpus as boolean | undefined) ?? false
    const includeHoldout = (body.includeHoldout as boolean | undefined) ?? false

    // Write lock file
    const lock: RunLock = {
      runId,
      startedAt: now,
      modules,
      fullCorpus,
      includeHoldout,
    }
    writeLockAtomic(lock)

    // Write initial progress file
    writeProgressAtomic(runId, {
      runId,
      status: 'queued',
      progress: 0,
      currentModule: null,
      modulesCompleted: 0,
      modulesTotal: modules ? modules.length : 0,
      samplesProcessed: 0,
      samplesTotal: 0,
      nonConformities: 0,
      elapsed: 0,
      eta: null,
      startedAt: now,
      fullCorpus,
      includeHoldout,
      modules,
    })

    // Audit log the action
    void auditLog.configChange({
      endpoint: '/api/admin/validation/run',
      field: 'validation_run',
      oldValue: '',
      newValue: runId,
    })

    return NextResponse.json(
      { runId, status: 'queued' },
      { status: 200, headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error('Validation run POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}, { role: 'admin' })
