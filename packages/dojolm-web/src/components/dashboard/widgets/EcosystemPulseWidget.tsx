'use client'

/**
 * File: EcosystemPulseWidget.tsx
 * Purpose: Ecosystem health widget showing cross-module findings, events, and active modules
 * Story: TPI-NODA-8.4
 */

import { useState, useEffect } from 'react'
import { WidgetCard } from '../WidgetCard'
import { MetricCard } from '@/components/ui/MetricCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Activity, Layers, AlertTriangle, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import type { EcosystemStats } from '@/lib/ecosystem-types'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

const MODULE_LABELS: Record<string, string> = {
  scanner: 'Haiku Scanner',
  atemi: 'Atemi Lab',
  sage: 'SAGE',
  arena: 'Arena',
  mitsuke: 'Mitsuke',
  attackdna: 'Amaterasu DNA',
  ronin: 'Ronin Hub',
  jutsu: 'LLM Jutsu',
  guard: 'Hattori Guard',
}

const MODULE_COLORS: Record<string, string> = {
  scanner: 'var(--dojo-primary)',
  atemi: 'var(--danger)',
  sage: 'var(--bu-electric)',
  arena: 'var(--warning)',
  mitsuke: 'var(--severity-high)',
  attackdna: 'var(--success)',
  ronin: 'var(--severity-medium)',
  jutsu: 'var(--bu-electric)',
  guard: 'var(--dojo-primary)',
}

export function EcosystemPulseWidget() {
  const [stats, setStats] = useState<EcosystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await fetchWithAuth('/api/ecosystem/findings?mode=stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const json = await res.json()
        if (!cancelled) {
          setStats(json.data)
        }
      } catch {
        // Non-critical — widget shows empty state
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  const hasActivity = stats && stats.totalFindings > 0

  return (
    <WidgetCard
      title="Ecosystem Pulse"
      actions={
        <span className={cn(
          'w-2.5 h-2.5 rounded-full',
          hasActivity
            ? 'bg-[var(--bu-electric)] motion-safe:animate-pulse'
            : 'bg-[var(--muted-foreground)]'
        )} />
      }
    >
      {loading ? (
        <div className="space-y-2 motion-safe:animate-pulse" aria-busy="true" aria-label="Loading Ecosystem Pulse" role="status">
          <div className="h-16 bg-muted/50 rounded" />
          <div className="h-16 bg-muted/50 rounded" />
        </div>
      ) : !stats || stats.totalFindings === 0 ? (
        <div className="text-center py-6">
          <Layers className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No ecosystem data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Use &ldquo;Send to...&rdquo; on findings to connect modules</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Total Findings"
              value={stats.totalFindings}
              icon={Layers}
              accent="primary"
            />
            <MetricCard
              label="Last 24h"
              value={stats.findings24h}
              icon={Zap}
              accent={stats.findings24h > 0 ? 'warning' : 'success'}
            />
          </div>

          {/* Severity breakdown */}
          <div className="flex gap-2">
            {stats.bySeverity.CRITICAL > 0 && (
              <Badge variant="critical" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                {stats.bySeverity.CRITICAL} critical
              </Badge>
            )}
            {stats.bySeverity.WARNING > 0 && (
              <Badge variant="high" className="text-xs">
                {stats.bySeverity.WARNING} warning
              </Badge>
            )}
            {stats.bySeverity.INFO > 0 && (
              <Badge variant="info" className="text-xs">
                {stats.bySeverity.INFO} info
              </Badge>
            )}
          </div>

          {/* Active modules */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Active Modules</p>
            <div className="flex flex-wrap gap-1.5">
              {(['scanner', 'atemi', 'sage', 'arena', 'mitsuke', 'attackdna', 'ronin', 'jutsu', 'guard'] as const).map((mod) => {
                const count = stats.byModule[mod] ?? 0
                const isActive = stats.activeModules.includes(mod)
                return (
                  <div
                    key={mod}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
                      'border',
                      isActive
                        ? 'border-[var(--dojo-primary)]/30 bg-[var(--dojo-primary)]/5'
                        : 'border-[var(--border)] bg-[var(--bg-secondary)] opacity-60',
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isActive ? MODULE_COLORS[mod] : 'var(--muted-foreground)' }}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{MODULE_LABELS[mod]}</span>
                    {count > 0 && (
                      <span className="text-muted-foreground">({count})</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Collapsible module connection graph */}
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'flex items-center gap-1.5 w-full text-xs text-muted-foreground',
              'hover:text-foreground motion-safe:transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded',
              'py-1',
            )}
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide data flow details' : 'Show data flow details'}
          >
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Data Flow Details</span>
            {expanded ? (
              <ChevronUp className="w-3 h-3 ml-auto" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-auto" aria-hidden="true" />
            )}
          </button>

          {expanded && (
            <div className="space-y-1.5 text-xs motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-[var(--transition-fast)]">
              {Object.entries(stats.byType).map(([type, count]) => {
                if (count === 0) return null
                const label = type.replace(/_/g, ' ')
                const pct = stats.totalFindings > 0 ? Math.round((count / stats.totalFindings) * 100) : 0
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="w-24 text-muted-foreground capitalize">{label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--dojo-primary)] rounded-full motion-safe:transition-[width] motion-safe:duration-[var(--transition-slow)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  )
}
