'use client'

/**
 * File: ComplianceBarsWidget.tsx
 * Purpose: 6 horizontal bars for framework compliance coverage
 * Story: TPI-NODA-1.5.9
 */

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { EnhancedProgress } from '@/components/ui/EnhancedProgress'
import { WidgetCard } from '../WidgetCard'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface FrameworkCoverage {
  name: string
  coverage: number
}

export function ComplianceBarsWidget() {
  const [frameworks, setFrameworks] = useState<FrameworkCoverage[]>([])
  const [loading, setLoading] = useState(true)
  const { setActiveTab } = useNavigation()

  useEffect(() => {
    let cancelled = false
    async function fetchCompliance() {
      try {
        const res = await fetchWithAuth('/api/compliance')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.frameworks) {
            const list: FrameworkCoverage[] = data.frameworks.map((fw: { name: string; avgCoverage?: number }) => ({
              name: fw.name,
              coverage: Math.round(fw.avgCoverage ?? 0),
            }))
            setFrameworks(list.slice(0, 6))
          }
        }
      } catch {
        // Silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCompliance()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetCard
      title="Compliance Coverage"
      actions={
        <button
          onClick={() => setActiveTab('compliance')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]"
        >
          Bushido Book
        </button>
      }
    >
      <div className="space-y-2">
        {frameworks.map(fw => (
          <div key={fw.name} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate" title={fw.name}>{fw.name}</span>
              <span className="tabular-nums font-medium">{fw.coverage}%</span>
            </div>
            <EnhancedProgress
              value={fw.coverage}
              max={100}
              color={fw.coverage >= 80 ? 'success' : fw.coverage >= 50 ? 'warning' : 'danger'}
              size="sm"
            />
          </div>
        ))}
        {loading && frameworks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Loading compliance data...</p>
        )}
        {!loading && frameworks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No compliance data available</p>
        )}
      </div>
    </WidgetCard>
  )
}
