'use client'

/**
 * File: ThreatRadar.tsx
 * Purpose: Animated SVG radar with 6 category sectors — pulse on detection, click to navigate
 * Story: TPI-NODA-1.5.7
 */

import { useId, useMemo } from 'react'
import { useScannerMetrics } from '@/lib/hooks'
import { useScanner } from '@/lib/ScannerContext'
import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'

interface Sector {
  label: string
  shortLabel: string
  engineId: string
  angle: number
  color: string
}

const SECTORS: Sector[] = [
  { label: 'Prompt Injection', shortLabel: 'PI', engineId: 'Prompt Injection', angle: 0, color: '#E63946' },
  { label: 'Jailbreak', shortLabel: 'JB', engineId: 'Jailbreak', angle: 60, color: '#F77F00' },
  { label: 'Social Engineering', shortLabel: 'SE', engineId: 'TPI', angle: 120, color: '#FCBF49' },
  { label: 'Evasion/Encoding', shortLabel: 'EE', engineId: 'Agent Security', angle: 180, color: '#90BE6D' },
  { label: 'Multimodal', shortLabel: 'MM', engineId: 'Multimodal Security', angle: 240, color: '#577590' },
  { label: 'Agent/Tool', shortLabel: 'AT', engineId: 'Supply Chain', angle: 300, color: '#9B5DE5' },
]

const RADIUS = 80
const CENTER = 100

function polarToCartesian(angle: number, r: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180
  return {
    x: Math.round((CENTER + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((CENTER + r * Math.sin(rad)) * 100) / 100,
  }
}

function sectorPath(startAngle: number, endAngle: number, r: number): string {
  const start = polarToCartesian(startAngle, r)
  const end = polarToCartesian(endAngle, r)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M${CENTER},${CENTER} L${start.x},${start.y} A${r},${r} 0 ${largeArc},1 ${end.x},${end.y} Z`
}

export function ThreatRadar() {
  const svgId = useId()
  const metrics = useScannerMetrics()
  const { scanResult, toggleFilter } = useScanner()
  const { setActiveTab } = useNavigation()

  // Count detections per engine from latest scan
  const detectionMap = useMemo(() => {
    const map = new Map<string, number>()
    if (scanResult?.findings) {
      for (const finding of scanResult.findings) {
        const engine = finding.engine ?? finding.source ?? 'unknown'
        map.set(engine, (map.get(engine) ?? 0) + 1)
      }
    }
    return map
  }, [scanResult])

  const handleSectorClick = (engineId: string) => {
    toggleFilter(engineId)
    setActiveTab('scanner')
  }

  return (
    <WidgetCard title="Threat Radar">
      <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 200 200"
          className="w-full max-w-[200px] h-auto"
          role="img"
          aria-label={`Threat radar showing ${metrics.threatsDetected} total threats across 6 categories`}
        >
          <defs>
            {/* Scan line gradient */}
            <linearGradient id={`${svgId}-scan`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(230,57,70,0)" />
              <stop offset="100%" stopColor="rgba(230,57,70,0.6)" />
            </linearGradient>
          </defs>

          {/* Background rings */}
          {[0.33, 0.66, 1].map(scale => (
            <circle
              key={`ring-${scale}`}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS * scale}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          ))}

          {/* Cross lines */}
          {SECTORS.map(sector => {
            const p = polarToCartesian(sector.angle, RADIUS)
            return (
              <line
                key={`line-${sector.angle}`}
                x1={CENTER}
                y1={CENTER}
                x2={p.x}
                y2={p.y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.5"
              />
            )
          })}

          {/* Sectors */}
          {SECTORS.map((sector) => {
            const startAngle = sector.angle
            const endAngle = startAngle + 60
            const detections = detectionMap.get(sector.engineId) ?? 0
            const intensity = Math.min(detections / 3, 1)

            return (
              <g key={sector.label}>
                <path
                  d={sectorPath(startAngle, endAngle, RADIUS)}
                  fill={sector.color}
                  fillOpacity={detections > 0 ? 0.15 + intensity * 0.35 : 0.05}
                  stroke={sector.color}
                  strokeWidth="0.5"
                  strokeOpacity={0.3}
                  className={cn(
                    'cursor-pointer',
                    'motion-safe:transition-[fill-opacity] motion-safe:duration-[var(--transition-normal)]',
                    'focus-visible:outline-2 focus-visible:outline-[var(--bu-electric)] focus-visible:outline-offset-1',
                    detections > 0 && 'motion-safe:animate-pulse'
                  )}
                  onClick={() => handleSectorClick(sector.engineId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSectorClick(sector.engineId) }}
                  aria-label={`${sector.label}: ${detections} detections. Click to filter scanner.`}
                />
                {/* Label */}
                {(() => {
                  const labelAngle = startAngle + 30
                  const labelPos = polarToCartesian(labelAngle, RADIUS * 0.65)
                  return (
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[8px] fill-current text-muted-foreground pointer-events-none select-none"
                      aria-hidden="true"
                    >
                      {sector.shortLabel}
                    </text>
                  )
                })()}
              </g>
            )
          })}

          {/* Rotating scan line */}
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER - RADIUS}
            stroke={`url(#${svgId}-scan)`}
            strokeWidth="2"
            className="origin-center motion-safe:animate-spin motion-reduce:hidden"
            style={{ animationDuration: '4s' }}
          />

          {/* Center count */}
          <circle cx={CENTER} cy={CENTER} r="18" fill="var(--bg-secondary)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <text
            x={CENTER}
            y={CENTER - 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-lg font-bold fill-current text-foreground"
          >
            {metrics.threatsDetected}
          </text>
          <text
            x={CENTER}
            y={CENTER + 10}
            textAnchor="middle"
            className="text-[6px] fill-current text-muted-foreground"
          >
            threats
          </text>
        </svg>
      </div>
    </WidgetCard>
  )
}
