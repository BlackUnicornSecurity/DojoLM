'use client'

/**
 * File: MitsukeAlertWidget.tsx
 * Purpose: Latest 4 Mitsuke threat entries with severity and timestamp
 * Story: TPI-NODA-1.5.8; Story 2.1.3 — wired to /api/mitsuke/entries (no mock data)
 */

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface ThreatEntry {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  title: string
  firstSeen: string
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-[var(--severity-critical-bg)] text-[var(--severity-critical)] border-[var(--severity-critical)]/30',
  HIGH: 'bg-[var(--severity-high-bg)] text-[var(--severity-high-text)] border-[var(--severity-high-text)]/30',
  MEDIUM: 'bg-[var(--severity-medium-bg)] text-[var(--severity-medium)] border-[var(--severity-medium)]/30',
  LOW: 'bg-[var(--severity-low-bg)] text-[var(--severity-low-text)] border-[var(--severity-low-text)]/30',
  INFO: 'bg-muted text-muted-foreground border-border',
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  } catch {
    return iso
  }
}

export function MitsukeAlertWidget() {
  const { setActiveTab } = useNavigation()
  const [entries, setEntries] = useState<ThreatEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetchWithAuth('/api/mitsuke/entries?limit=4')
        if (cancelled) return
        if (!res.ok) { if (!cancelled) setError(true); return }
        const data = await res.json()
        if (!cancelled && Array.isArray(data.entries)) {
          // Runtime validation — drop entries with missing required fields
          const validated = (data.entries as unknown[]).filter(
            (e): e is ThreatEntry =>
              e !== null &&
              typeof e === 'object' &&
              typeof (e as ThreatEntry).id === 'string' &&
              typeof (e as ThreatEntry).title === 'string' &&
              typeof (e as ThreatEntry).severity === 'string'
          )
          setEntries(validated.slice(0, 4))
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const criticalCount = entries.filter(e => e.severity === 'CRITICAL').length
  const hasCritical = criticalCount > 0

  return (
    <WidgetCard
      title="Mitsuke Alerts"
      className={hasCritical ? 'border-l-2 border-l-[var(--severity-critical)]' : undefined}
      actions={
        <div className="flex items-center gap-2">
          {hasCritical && (
            <span
              className="text-xs px-1.5 py-0.5 bg-[var(--severity-critical-bg)] text-[var(--severity-critical)] rounded-full font-medium"
              aria-label={`${criticalCount} critical alert${criticalCount !== 1 ? 's' : ''}`}
              role="status"
            >
              {criticalCount}
            </span>
          )}
          <button
            onClick={() => setActiveTab('mitsuke')}
            className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
            aria-label="View Mitsuke alerts"
          >
            View Mitsuke
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading alerts">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted/50 rounded motion-safe:animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
          <p className="text-xs text-muted-foreground">Could not load alerts</p>
          <p className="text-xs text-muted-foreground/60">Check your connection and try again</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
          <p className="text-xs text-muted-foreground">No alerts</p>
          <p className="text-xs text-muted-foreground/60">Threat feed is clear</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-start gap-2 py-1">
              <span className={cn(
                'px-1 py-0.5 text-xs font-medium rounded border flex-shrink-0 mt-0.5',
                SEVERITY_COLORS[entry.severity] ?? SEVERITY_COLORS.INFO
              )}>
                {entry.severity}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{entry.title}</div>
                <div className="text-xs text-muted-foreground">{formatRelative(entry.firstSeen)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
