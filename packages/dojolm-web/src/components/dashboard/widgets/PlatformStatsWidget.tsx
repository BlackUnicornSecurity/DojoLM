'use client'

/**
 * File: PlatformStatsWidget.tsx
 * Purpose: Combined 3-metric card showing pattern count, fixture count, and OWASP coverage
 * Story: NODA-4 Story 3.2 — Merges PatternCountWidget + FixtureCountWidget + OWASPSummaryWidget
 */

import { useState, useEffect } from 'react'
import { WidgetCard } from '../WidgetCard'
import { Layers, FlaskConical, Shield, Cpu, Activity } from 'lucide-react'
import { OWASP_LLM_COVERAGE_DATA } from '@/lib/constants'
import { getCachedFixtureManifest, getCachedScannerStats } from '@/lib/client-data-cache'

export function PlatformStatsWidget() {
  const [patternCount, setPatternCount] = useState(0)
  const [moduleCount, setModuleCount] = useState(0)
  const [fixtureCount, setFixtureCount] = useState(0)
  const [categoryCount, setCategoryCount] = useState(0)
  const engineCount = 13

  const owaspAvg = OWASP_LLM_COVERAGE_DATA.length > 0
    ? Math.round(OWASP_LLM_COVERAGE_DATA.reduce((sum, e) => sum + e.post, 0) / OWASP_LLM_COVERAGE_DATA.length)
    : 0

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const [stats, fixtures] = await Promise.all([
          getCachedScannerStats(),
          getCachedFixtureManifest(),
        ])

        if (!cancelled) {
          setPatternCount(stats.patternCount ?? 0)
          setModuleCount(stats.groupCount ?? stats.patternGroups?.length ?? 0)

          if (fixtures.categories && typeof fixtures.categories === 'object') {
            const cats = Object.keys(fixtures.categories)
            setCategoryCount(cats.length)
            let total = 0
            for (const cat of Object.values(fixtures.categories) as Array<{ files?: unknown[] }>) {
              total += Array.isArray(cat.files) ? cat.files.length : 0
            }
            setFixtureCount(total)
          }
        }
      } catch {
        // Silent failure — display defaults
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetCard title="Platform Stats">
      <div className="grid grid-cols-5 gap-3">
        <div className="text-center space-y-1">
          <Layers className="w-5 h-5 mx-auto text-[var(--dojo-primary)]" aria-hidden="true" />
          <div className="text-lg font-bold tabular-nums">{patternCount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Patterns</div>
          <div className="text-xs text-muted-foreground">{moduleCount} modules</div>
        </div>
        <div className="text-center space-y-1">
          <FlaskConical className="w-5 h-5 mx-auto text-[var(--warning)]" aria-hidden="true" />
          <div className="text-lg font-bold tabular-nums">{fixtureCount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Fixtures</div>
          <div className="text-xs text-muted-foreground">{categoryCount} categories</div>
        </div>
        <div className="text-center space-y-1">
          <Shield className="w-5 h-5 mx-auto text-[var(--success)]" aria-hidden="true" />
          <div className="text-lg font-bold tabular-nums">{owaspAvg}%</div>
          <div className="text-xs text-muted-foreground">OWASP</div>
          <div className="text-xs text-muted-foreground">LLM Top 10</div>
        </div>
        <div className="text-center space-y-1">
          <Cpu className="w-5 h-5 mx-auto text-[var(--bu-electric)]" aria-hidden="true" />
          <div className="text-lg font-bold tabular-nums">{engineCount}</div>
          <div className="text-xs text-muted-foreground">Engines</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="text-center space-y-1">
          <Activity className="w-5 h-5 mx-auto text-[var(--status-allow)]" aria-hidden="true" />
          <div className="text-lg font-bold tabular-nums">12</div>
          <div className="text-xs text-muted-foreground">Modules</div>
          <div className="text-xs text-muted-foreground">Online</div>
        </div>
      </div>
    </WidgetCard>
  )
}
