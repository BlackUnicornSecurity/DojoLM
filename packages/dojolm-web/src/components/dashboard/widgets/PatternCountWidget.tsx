'use client'

/**
 * File: PatternCountWidget.tsx
 * Purpose: Large pattern and module count display
 * Story: TPI-NODA-1.5.9
 */

import { useState, useEffect } from 'react'
import { MetricCard } from '@/components/ui/MetricCard'
import { WidgetCard } from '../WidgetCard'
import { Layers } from 'lucide-react'

export function PatternCountWidget() {
  const [patternCount, setPatternCount] = useState(0)
  const [moduleCount, setModuleCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setPatternCount(data.patternCount ?? 0)
            setModuleCount(data.patternGroups?.length ?? 0)
          }
        }
      } catch {
        // Silent
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetCard title="Patterns">
      <MetricCard
        label={`${patternCount} patterns across ${moduleCount} modules`}
        value={patternCount}
        icon={Layers}
        accent="primary"
      />
    </WidgetCard>
  )
}
