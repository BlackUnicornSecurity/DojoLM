/**
 * File: route.ts
 * Purpose: Admin validation modules API — GET list of modules with calibration status
 * Story: K6.4 (Admin Validation API Routes)
 * Index:
 * - Constants (line 13)
 * - GET handler (line 25)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, readFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { withAuth } from '@/lib/auth/route-guard'
import { getDataPath } from '@/lib/runtime-paths'

const MODULES_DIR = getDataPath('validation', 'modules')

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

/** Maximum age for calibration validity (30 days in ms) */
const CALIBRATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/** Safe module ID pattern — prevents path traversal */
const SAFE_MODULE_ID = /^[a-zA-Z0-9_-]{1,128}$/

interface ModuleInfo {
  moduleId: string
  tier: number | null
  lastCalibrationDate: string | null
  currentToolHash: string | null
  valid: boolean
}

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    // Ensure directory exists
    mkdirSync(MODULES_DIR, { recursive: true })

    let moduleDirs: string[] = []
    try {
      moduleDirs = readdirSync(MODULES_DIR).filter(d => SAFE_MODULE_ID.test(d))
    } catch {
      return NextResponse.json(
        { modules: [] },
        { headers: SECURITY_HEADERS }
      )
    }

    const modules: ModuleInfo[] = []

    for (const moduleId of moduleDirs) {
      try {
        const metaPath = join(MODULES_DIR, moduleId, 'meta.json')
        const raw = readFileSync(metaPath, 'utf8')
        const meta = JSON.parse(raw)

        const lastCalibrationDate: string | null = meta.lastCalibrationDate ?? null
        const currentToolHash: string | null = meta.currentToolHash ?? null
        const calibratedToolHash: string | null = meta.calibratedToolHash ?? null
        const tier: number | null = typeof meta.tier === 'number' ? meta.tier : null

        // Determine validity: hash must match and calibration must be recent
        let valid = false
        if (lastCalibrationDate && currentToolHash && calibratedToolHash) {
          const hashMatch = currentToolHash === calibratedToolHash
          const calibDate = new Date(lastCalibrationDate)
          const age = Date.now() - calibDate.getTime()
          valid = hashMatch && age < CALIBRATION_MAX_AGE_MS
        }

        modules.push({
          moduleId,
          tier,
          lastCalibrationDate,
          currentToolHash,
          valid,
        })
      } catch {
        // Include module with unknown status if metadata is unreadable
        modules.push({
          moduleId,
          tier: null,
          lastCalibrationDate: null,
          currentToolHash: null,
          valid: false,
        })
      }
    }

    return NextResponse.json(
      { modules },
      { headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error('Validation modules GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}, { role: 'admin', skipCsrf: true })
