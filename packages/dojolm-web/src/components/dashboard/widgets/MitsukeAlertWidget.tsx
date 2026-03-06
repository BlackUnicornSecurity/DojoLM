'use client'

/**
 * File: MitsukeAlertWidget.tsx
 * Purpose: Latest 4 Mitsuke threat alerts with severity, timestamp, acknowledged status
 * Story: TPI-NODA-1.5.8
 */

import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle } from 'lucide-react'

interface ThreatAlert {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  timestamp: string
  acknowledged: boolean
}

// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
const MOCK_ALERTS: ThreatAlert[] = [
  { id: 'a1', severity: 'critical', title: 'Novel prompt injection variant detected', timestamp: '3 min ago', acknowledged: false },
  { id: 'a2', severity: 'high', title: 'Model extraction technique in MITRE feed', timestamp: '15 min ago', acknowledged: false },
  { id: 'a3', severity: 'high', title: 'Jailbreak bypass via multi-turn conversation', timestamp: '1 hour ago', acknowledged: true },
  { id: 'a4', severity: 'medium', title: 'Supply chain advisory: typosquatting package', timestamp: '2 hours ago', acknowledged: true },
]

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-[var(--severity-critical-bg)] text-[var(--severity-critical)] border-[var(--severity-critical)]/30',
  high: 'bg-[var(--severity-high-bg)] text-[var(--severity-high-text)] border-[var(--severity-high-text)]/30',
  medium: 'bg-[var(--severity-medium-bg)] text-[var(--severity-medium)] border-[var(--severity-medium)]/30',
  low: 'bg-[var(--severity-low-bg)] text-[var(--severity-low-text)] border-[var(--severity-low-text)]/30',
}

export function MitsukeAlertWidget() {
  const { setActiveTab } = useNavigation()
  const unacknowledged = MOCK_ALERTS.filter(a => !a.acknowledged).length
  const hasCritical = MOCK_ALERTS.some(a => !a.acknowledged && a.severity === 'critical')

  return (
    <WidgetCard
      title="Mitsuke Alerts"
      className={hasCritical ? 'border-l-2 border-l-[var(--severity-critical)]' : undefined}
      actions={
        <div className="flex items-center gap-2">
          {unacknowledged > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-[var(--severity-critical-bg)] text-[var(--severity-critical)] rounded-full font-medium">
              {unacknowledged}
            </span>
          )}
          <button
            onClick={() => setActiveTab('strategic')}
            className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dojo-primary)]"
          >
            View Mitsuke
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        {MOCK_ALERTS.map(alert => (
          <div key={alert.id} className="flex items-start gap-2 py-1">
            <span className={cn(
              'px-1 py-0.5 text-xs font-medium rounded border flex-shrink-0 mt-0.5',
              SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.low
            )}>
              {alert.severity.toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{alert.title}</div>
              <div className="text-xs text-muted-foreground">{alert.timestamp}</div>
            </div>
            {alert.acknowledged ? (
              <CheckCircle className="w-3.5 h-3.5 text-[var(--status-allow)] flex-shrink-0 mt-0.5" aria-label="Acknowledged" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--severity-medium)] flex-shrink-0 mt-0.5" aria-label="Not acknowledged" />
            )}
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
