/**
 * File: route.ts
 * Purpose: GET /api/mitsuke/entries — query threat feed entries from storage
 * Story: Train 3 PR-4e.2 — Mitsuke real backend wiring
 *
 * Queries the threat_feed_entries table (or falls back to demo data)
 * and returns results to the MitsukeLibrary and ThreatFeedStream components.
 */

import { NextResponse } from 'next/server'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface ThreatEntry {
  id: string
  source: string
  threatType: string
  title: string
  description: string
  indicators: string[]
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  confidence: number
  firstSeen: string
  lastSeen: string
  createdAt: string
}

const ENTRIES_DIR = getDataPath('mitsuke', 'entries')

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')
    const source = searchParams.get('source')
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
    const offset = Number(searchParams.get('offset')) || 0

    let entries: ThreatEntry[] = []

    // Read from file-based storage if available
    if (existsSync(ENTRIES_DIR)) {
      const files = await readdir(ENTRIES_DIR)
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse()

      for (const file of jsonFiles) {
        try {
          const raw = await readFile(path.join(ENTRIES_DIR, file), 'utf-8')
          const entry = JSON.parse(raw) as ThreatEntry
          entries.push(entry)
        } catch {
          // Skip malformed files
        }
      }
    }

    // Apply filters
    if (severity) {
      entries = entries.filter(e => e.severity === severity.toUpperCase())
    }
    if (source) {
      entries = entries.filter(e => e.source === source)
    }

    const total = entries.length
    const paginated = entries.slice(offset, offset + limit)

    return NextResponse.json({
      entries: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch threat entries', detail: message },
      { status: 500 },
    )
  }
}
