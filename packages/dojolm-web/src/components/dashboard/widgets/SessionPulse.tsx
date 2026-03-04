'use client'

/**
 * File: SessionPulse.tsx
 * Purpose: Session stats (scans, threats, pass rate, engines) with sparkline and pulse dot
 * Story: TPI-NODA-1.5.5
 */

import { useScannerMetrics } from '@/lib/hooks'
import { useScanner } from '@/lib/ScannerContext'
import { MetricCard } from '@/components/ui/MetricCard'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { ScanLine, ShieldAlert, CheckCircle, Cpu } from 'lucide-react'

export function SessionPulse() {
  const metrics = useScannerMetrics()
  const { isScanning } = useScanner()

  return (
    <WidgetCard
      title="Session Pulse"
      actions={
        <span className={cn(
          'w-2.5 h-2.5 rounded-full',
          isScanning
            ? 'bg-[var(--dojo-primary)] motion-safe:animate-pulse'
            : 'bg-green-500'
        )} />
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Total Scans"
          value={metrics.totalScans}
          icon={ScanLine}
          accent="primary"
        />
        <MetricCard
          label="Threats"
          value={metrics.threatsDetected}
          icon={ShieldAlert}
          sparklineData={metrics.threatTrend}
          accent={metrics.threatsDetected > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          label="Pass Rate"
          value={metrics.passRate}
          icon={CheckCircle}
          accent="success"
        />
        <MetricCard
          label="Engines"
          value={`${metrics.activeEngines}/${metrics.totalEngines}`}
          icon={Cpu}
          accent={metrics.activeEngines === metrics.totalEngines ? 'primary' : 'warning'}
        />
      </div>
    </WidgetCard>
  )
}
