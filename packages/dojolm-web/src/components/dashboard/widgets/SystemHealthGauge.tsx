'use client'

/**
 * File: SystemHealthGauge.tsx
 * Purpose: Composite system health score from modules, guard, fixtures, and patterns
 * Story: TPI-NODA-1.5.2
 */

import { useState, useEffect } from 'react'
import { EnsoGauge } from '@/components/ui/EnsoGauge'
import { WidgetCard } from '../WidgetCard'

interface HealthData {
  modulesLoaded: number
  guardEnabled: boolean
  fixtureCount: number
  patternCount: number
  guardMode: string
}

function computeScore(data: HealthData): number {
  let score = 0
  if (data.modulesLoaded > 0) score += 25
  if (data.guardEnabled) score += 25
  if (data.fixtureCount > 0) score += 25
  if (data.patternCount > 500) score += 25
  else if (data.patternCount > 0) score += 10
  return score
}

export function SystemHealthGauge() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchHealth() {
      try {
        const [statsRes, guardRes, fixturesRes] = await Promise.allSettled([
          fetch('/api/stats'),
          fetch('/api/llm/guard'),
          fetch('/api/fixtures'),
        ])

        const stats = statsRes.status === 'fulfilled' && statsRes.value.ok
          ? await statsRes.value.json()
          : null
        const guard = guardRes.status === 'fulfilled' && guardRes.value.ok
          ? await guardRes.value.json()
          : null
        const fixtures = fixturesRes.status === 'fulfilled' && fixturesRes.value.ok
          ? await fixturesRes.value.json()
          : null

        if (cancelled) return

        const patternGroups = stats?.patternGroups ?? []
        const modulesLoaded = patternGroups.length
        const patternCount = stats?.patternCount ?? 0
        const guardData = guard?.data ?? guard ?? {}
        const guardEnabled = guardData.enabled ?? false
        const guardMode = guardData.mode ?? 'off'

        // Count fixtures from manifest
        let fixtureCount = 0
        if (fixtures?.categories) {
          for (const cat of Object.values(fixtures.categories) as Array<{ files?: string[] }>) {
            fixtureCount += cat.files?.length ?? 0
          }
        }

        setHealthData({ modulesLoaded, guardEnabled, fixtureCount, patternCount, guardMode })
      } catch {
        // Silent failure — gauge shows 0
      }
    }

    fetchHealth()
    return () => { cancelled = true }
  }, [])

  const score = healthData ? computeScore(healthData) : 0
  const label = healthData?.guardEnabled
    ? healthData.guardMode.charAt(0).toUpperCase() + healthData.guardMode.slice(1)
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
