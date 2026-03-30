/**
 * File: route.ts
 * Purpose: Admin calibration API — POST to trigger calibration pre-check
 * Story: K6.4 (Admin Validation API Routes)
 * Index:
 * - Constants (line 13)
 * - Lock helpers (line 25)
 * - POST handler (line 55)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import crypto from 'node:crypto'
import { withAuth } from '@/lib/auth/route-guard'
import { auditLog } from '@/lib/audit-logger'
import { getDataPath } from '@/lib/runtime-paths'

const DATA_DIR = getDataPath('validation')
const CALIBRATE_LOCK_PATH = join(DATA_DIR, 'calibrate-lock.json')
const MODULES_DIR = join(DATA_DIR, 'modules')

/** Safe module ID pattern — prevents path traversal */
const SAFE_MODULE_ID = /^[a-zA-Z0-9_-]{1,128}$/

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

interface CalibrateLock {
  runId: string
  startedAt: string
}

function readCalibrateLock(): CalibrateLock | null {
  try {
    const raw = readFileSync(CALIBRATE_LOCK_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.runId === 'string') {
      return parsed as CalibrateLock
    }
    return null
  } catch {
    return null
  }
}

function writeCalibrateLockAtomic(lock: CalibrateLock): void {
  const dir = dirname(CALIBRATE_LOCK_PATH)
  mkdirSync(dir, { recursive: true })

  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const tmpPath = `${CALIBRATE_LOCK_PATH}.${uniqueSuffix}.tmp`

  const data = JSON.stringify(lock, null, 2)
  writeFileSync(tmpPath, data, 'utf8')
  renameSync(tmpPath, CALIBRATE_LOCK_PATH)
}

interface ModuleCalibrationResult {
  moduleId: string
  status: 'pass' | 'fail' | 'skipped'
  message: string
}

export const POST = withAuth(async (_request: NextRequest) => {
  try {
    // Check for concurrent calibration (lock file pattern)
    const existingLock = readCalibrateLock()
    if (existingLock) {
      return NextResponse.json(
        { error: 'A calibration run is already in progress', runId: existingLock.runId },
        { status: 429, headers: SECURITY_HEADERS }
      )
    }

    const runId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Write lock file
    writeCalibrateLockAtomic({ runId, startedAt: now })

    // Read module metadata and produce per-module pass/fail
    const results: ModuleCalibrationResult[] = []

    try {
      mkdirSync(MODULES_DIR, { recursive: true })
      const moduleDirs = readdirSync(MODULES_DIR).filter(d => SAFE_MODULE_ID.test(d))

      for (const moduleId of moduleDirs) {
        try {
          const metaPath = join(MODULES_DIR, moduleId, 'meta.json')
          const raw = readFileSync(metaPath, 'utf8')
          const meta = JSON.parse(raw)

          // Check if calibration data exists and is recent
          const hasCalibration = !!meta.lastCalibrationDate
          const toolHashMatch = meta.currentToolHash === meta.calibratedToolHash

          if (!hasCalibration) {
            results.push({
              moduleId,
              status: 'fail',
              message: 'No calibration data found',
            })
          } else if (!toolHashMatch) {
            results.push({
              moduleId,
              status: 'fail',
              message: 'Tool hash mismatch — recalibration required',
            })
          } else {
            results.push({
              moduleId,
              status: 'pass',
              message: 'Calibration valid',
            })
          }
        } catch {
          results.push({
            moduleId,
            status: 'skipped',
            message: 'Unable to read module metadata',
          })
        }
      }
    } catch {
      // Modules directory doesn't exist — no modules to calibrate
    }

    // Release lock after quick pre-check
    try {
      unlinkSync(CALIBRATE_LOCK_PATH)
    } catch {
      // Best effort cleanup
    }

    // Audit log the action
    void auditLog.configChange({
      endpoint: '/api/admin/validation/calibrate',
      field: 'calibration_run',
      oldValue: '',
      newValue: runId,
    })

    return NextResponse.json(
      {
        runId,
        startedAt: now,
        completedAt: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.status === 'pass').length,
          failed: results.filter(r => r.status === 'fail').length,
          skipped: results.filter(r => r.status === 'skipped').length,
        },
      },
      { headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error('Calibration POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}, { role: 'admin' })
