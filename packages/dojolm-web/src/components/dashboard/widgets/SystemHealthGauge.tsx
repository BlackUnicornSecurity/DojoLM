'use client'

/**
 * File: SystemHealthGauge.tsx
 * Purpose: Composite system health score from modules, guard, fixtures, and patterns
 * Story: TPI-NODA-1.5.2
 */

import { useState, useEffect } from 'react'
import { EnsoGauge } from '@/components/ui/EnsoGauge'
import { WidgetCard } from '../WidgetCard'
import { getCachedFixtureManifest, getCachedScannerStats } from '@/lib/client-data-cache'
import { useGuardMode } from '@/lib/contexts/GuardContext'

interface HealthData {
  modulesLoaded: number
  fixtureCount: number
  patternCount: number
}

function computeScore(data: HealthData): number {
  let score = 0
  if (data.modulesLoaded > 0) score += 25
  if (data.fixtureCount > 0) score += 25
  if (data.patternCount > 500) score += 25
  else if (data.patternCount > 0) score += 10
  return score
}

export function SystemHealthGauge() {
  const { enabled, mode } = useGuardMode()
  const [healthData, setHealthData] = useState<HealthData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchHealth() {
      try {
        const [stats, fixtures] = await Promise.all([
          getCachedScannerStats(),
          getCachedFixtureManifest(),
        ])

        if (cancelled) return

        const modulesLoaded = stats.groupCount ?? stats.patternGroups?.length ?? 0
        const patternCount = stats?.patternCount ?? 0

        // Count fixtures from manifest
        let fixtureCount = 0
        if (fixtures?.categories) {
          for (const cat of Object.values(fixtures.categories) as Array<{ files?: unknown[] }>) {
            fixtureCount += cat.files?.length ?? 0
          }
        }

        setHealthData({ modulesLoaded, fixtureCount, patternCount })
      } catch {
        // Silent failure — gauge shows 0
      }
    }

    fetchHealth()
    return () => { cancelled = true }
  }, [])

  const score = healthData
    ? computeScore(healthData) + (enabled ? 25 : 0)
    : enabled ? 25 : 0
  const label = enabled
    ? mode.charAt(0).toUpperCase() + mode.slice(1)
    : 'Guard Off'

  return (
    <WidgetCard title="System Health">
      <EnsoGauge
        value={score}
        max={100}
        size={128}
        label={label}
      />
    </WidgetCard>
  )
}
