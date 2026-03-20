/**
 * File: route.ts
 * Purpose: Admin settings API — GET (read) and PATCH (update) editable settings
 * Story: H1.7 (Admin Panel Fixes)
 * Index:
 * - GET handler (line 18)
 * - PATCH handler (line 50)
 * - Validation helpers (line 40)
 * - Atomic file write (line 85)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import crypto from 'node:crypto'
import { withAuth } from '@/lib/auth/route-guard'

const SETTINGS_PATH = join(process.cwd(), 'data', 'admin-settings.json')

interface AdminSettings {
  sessionTtlMinutes: number
  retentionDays: number
}

const DEFAULT_SETTINGS: AdminSettings = {
  sessionTtlMinutes: 1440,
  retentionDays: 90,
}

function readSettings(): AdminSettings {
  try {
    const raw = readFileSync(SETTINGS_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      sessionTtlMinutes: typeof parsed.sessionTtlMinutes === 'number' ? parsed.sessionTtlMinutes : DEFAULT_SETTINGS.sessionTtlMinutes,
      retentionDays: typeof parsed.retentionDays === 'number' ? parsed.retentionDays : DEFAULT_SETTINGS.retentionDays,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function writeSettingsAtomic(settings: AdminSettings): void {
  const dir = dirname(SETTINGS_PATH)
  mkdirSync(dir, { recursive: true })

  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const tmpPath = `${SETTINGS_PATH}.${uniqueSuffix}.tmp`

  const data = JSON.stringify(settings, null, 2)
  writeFileSync(tmpPath, data, 'utf8')
  renameSync(tmpPath, SETTINGS_PATH)
}

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

// PT-AUTHZ-C02 fix: Require admin role for settings access
export const GET = withAuth(async () => {
  try {
    const settings = readSettings()
    return NextResponse.json(settings, { headers: SECURITY_HEADERS })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { role: 'admin', skipCsrf: true })

// PT-AUTHZ-C02 fix: Require admin role for settings modification
export const PATCH = withAuth(async (request) => {
  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
    }

    // Only allow known fields (allowlist)
    const ALLOWED_KEYS = new Set(['sessionTtlMinutes', 'retentionDays'])
    const unknownKeys = Object.keys(body).filter(k => !ALLOWED_KEYS.has(k))
    if (unknownKeys.length > 0) {
      return NextResponse.json(
        { error: `Unknown fields: ${unknownKeys.join(', ')}` },
        { status: 400 }
      )
    }

    // Read current settings as base
    const current = readSettings()

    // Validate sessionTtlMinutes
    if (body.sessionTtlMinutes !== undefined) {
      const val = body.sessionTtlMinutes
      if (typeof val !== 'number' || !Number.isFinite(val) || !Number.isInteger(val)) {
        return NextResponse.json({ error: 'sessionTtlMinutes must be an integer' }, { status: 400 })
      }
      if (val < 5 || val > 1440) {
        return NextResponse.json({ error: 'sessionTtlMinutes must be between 5 and 1440' }, { status: 400 })
      }
      current.sessionTtlMinutes = val
    }

    // Validate retentionDays
    if (body.retentionDays !== undefined) {
      const val = body.retentionDays
      if (typeof val !== 'number' || !Number.isFinite(val) || !Number.isInteger(val)) {
        return NextResponse.json({ error: 'retentionDays must be an integer' }, { status: 400 })
      }
      if (val < 1 || val > 365) {
        return NextResponse.json({ error: 'retentionDays must be between 1 and 365' }, { status: 400 })
      }
      current.retentionDays = val
    }

    writeSettingsAtomic(current)

    return NextResponse.json(current, { headers: SECURITY_HEADERS })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { role: 'admin' })
