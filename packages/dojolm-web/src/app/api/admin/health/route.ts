/**
 * File: route.ts
 * Purpose: Health check API endpoint for Admin system health dashboard
 * Story: TPI-NODA-002-04
 * Index:
 * - GET handler (line 13)
 * - Scanner health check (line 19)
 * - Guard status check (line 34)
 * - Storage status check (line 47)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'
import { demoHealthGet } from '@/lib/demo/mock-api-handlers'
import { readFileSync } from 'fs'
import { join } from 'path'
import { checkApiAuth } from '@/lib/api-auth'

// Read version at module load — safe for server-side API route
let appVersion = '0.1.0';
try {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  appVersion = pkg.version || appVersion;
} catch { /* fallback to default */ }

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoHealthGet()
  // ADM-SEC-01: Two-tier response — minimal for unauthenticated, full for authenticated.
  // Check for actual session cookie, not just checkApiAuth (which passes public routes).
  const sessionCookie = request.cookies.get('tpi_session')?.value;
  const isAuthenticated = !!sessionCookie && checkApiAuth(request) === null;

  try {
    const startTime = Date.now()

    // Unauthenticated callers get minimal health status only
    if (!isAuthenticated) {
      return NextResponse.json(
        { status: 'ok', timestamp: Date.now() },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    // Authenticated callers get full details

    // Scanner health check — direct import, no HTTP self-call
    let scannerReachable = false
    let scannerResponseTime: number | undefined
    try {
      const { scan } = await import('@dojolm/scanner')
      const scanStart = Date.now()
      scan('health-check-probe', {})
      scannerResponseTime = Date.now() - scanStart
      scannerReachable = true
    } catch {
      scannerReachable = false
    }

    // Guard status — read from guard storage if available
    let guardEnabled = false
    let guardMode = 'shinobi'
    let guardEventCount = 0
    try {
      const { getGuardConfig, getGuardStats } = await import('@/lib/storage/guard-storage')
      const config = await getGuardConfig()
      guardEnabled = config?.enabled ?? false
      guardMode = config?.mode ?? 'shinobi'
      const stats = await getGuardStats()
      guardEventCount = stats?.totalEvents ?? 0
    } catch {
      // Guard storage may not be initialized — use defaults
    }

    // Storage status
    let storageType = 'json'
    let modelsCount = 0
    try {
      storageType = process.env.TPI_STORAGE_BACKEND === 'db' ? 'database' : 'json'
      const { getStorage } = await import('@/lib/storage/storage-interface')
      const storage = await getStorage()
      const models = await storage.getModelConfigs()
      modelsCount = models.length
    } catch {
      // Storage may fail — return defaults
    }

    return NextResponse.json(
      {
        status: 'ok',
        scanner: {
          reachable: scannerReachable,
          responseTimeMs: scannerResponseTime,
          lastScanTime: null,
        },
        guard: {
          enabled: guardEnabled,
          mode: guardMode,
          eventCount: guardEventCount,
        },
        storage: {
          type: storageType,
          modelsCount,
        },
        app: {
          version: appVersion,
          // R3-010: Removed nodeVersion — aids attacker fingerprinting
          responseTimeMs: Date.now() - startTime,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Health check API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
