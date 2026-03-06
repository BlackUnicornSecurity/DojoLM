'use client'

/**
 * File: ThreatRadar.tsx
 * Purpose: Animated SVG radar with 6 category sectors — pulse on detection, click to navigate
 * Story: TPI-NODA-1.5.7, NODA-3 Story 3.3 (Threat Radar Enhancement)
 * Changes: Analogous blue spectrum, gradient fills, hover tooltips, minimum 280px height, pulse animation
 */

import { useId, useMemo, useState } from 'react'
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

/** Analogous blue spectrum — 3-4 shades of cyan/blue per Story 3.3 */
const SECTORS: Sector[] = [
  { label: 'Prompt Injection', shortLabel: 'PI', engineId: 'Prompt Injection', angle: 0, color: '#00D9FF' },
  { label: 'Jailbreak', shortLabel: 'JB', engineId: 'Jailbreak', angle: 60, color: '#0EA5E9' },
  { label: 'Social Engineering', shortLabel: 'SE', engineId: 'TPI', angle: 120, color: '#3B82F6' },
  { label: 'Evasion/Encoding', shortLabel: 'EE', engineId: 'Agent Security', angle: 180, color: '#6366F1' },
  { label: 'Multimodal', shortLabel: 'MM', engineId: 'Multimodal Security', angle: 240, color: '#8B5CF6' },
  { label: 'Agent/Tool', shortLabel: 'AT', engineId: 'Supply Chain', angle: 300, color: '#A78BFA' },
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
  const [hoveredSector, setHoveredSector] = useState<string | null>(null)

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
      <div className="flex flex-col items-center" style={{ minHeight: 280 }}>
        <svg
          viewBox="0 0 200 200"
          className="w-full max-w-[280px] h-auto"
          role="img"
          aria-label={`Threat radar showing ${metrics.threatsDetected} total threats across 6 categories`}
        >
          <defs>
            {/* Gradient fills per sector */}
            {SECTORS.map(sector => (
              <radialGradient key={`grad-${sector.shortLabel}`} id={`${svgId}-grad-${sector.shortLabel}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={sector.color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={sector.color} stopOpacity="0.08" />
              </radialGradient>
            ))}
            {/* Scan line gradient — cyan accent */}
            <linearGradient id={`${svgId}-scan`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(0,217,255,0)" />
              <stop offset="100%" stopColor="rgba(0,217,255,0.6)" />
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
              stroke="rgba(255,255,255,0.08)"
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
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.5"
              />
            )
          })}

          {/* Sectors with gradient fills */}
          {SECTORS.map((sector) => {
            const startAngle = sector.angle
            const endAngle = startAngle + 60
            const detections = detectionMap.get(sector.engineId) ?? 0
            const intensity = Math.min(detections / 3, 1)
            const isHovered = hoveredSector === sector.shortLabel

            return (
              <g key={sector.label}>
                {/* Gradient-filled sector */}
                <path
                  d={sectorPath(startAngle, endAngle, RADIUS)}
                  fill={detections > 0 ? `url(#${svgId}-grad-${sector.shortLabel})` : sector.color}
                  fillOpacity={detections > 0 ? 0.2 + intensity * 0.5 : 0.05}
                  stroke={isHovered ? '#FFFFFF' : sector.color}
                  strokeWidth={isHovered ? '1.5' : '1'}
                  strokeOpacity={isHovered ? 0.8 : 0.3}
                  className={cn(
                    'cursor-pointer',
                    'motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]',
                    'focus-visible:outline-2 focus-visible:outline-[var(--bu-electric)] focus-visible:outline-offset-1',
                  )}
                  onClick={() => handleSectorClick(sector.engineId)}
                  onMouseEnter={() => setHoveredSector(sector.shortLabel)}
                  onMouseLeave={() => setHoveredSector(null)}
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
                {/* Hover tooltip */}
                {isHovered && (() => {
                  const tooltipAngle = startAngle + 30
                  const tooltipPos = polarToCartesian(tooltipAngle, RADIUS + 12)
                  return (
                    <g className="pointer-events-none">
                      <rect
                        x={tooltipPos.x - 28}
                        y={tooltipPos.y - 10}
                        width="56"
                        height="20"
                        rx="4"
                        fill="var(--bg-tertiary)"
                        stroke="var(--border)"
                        strokeWidth="0.5"
                      />
                      <text
                        x={tooltipPos.x}
                        y={tooltipPos.y + 1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[7px] fill-current text-foreground"
                      >
                        {detections} found
                      </text>
                    </g>
                  )
                })()}
              </g>
            )
          })}

          {/* Subtle pulse animation on radar rings */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="rgba(0,217,255,0.15)"
            strokeWidth="1"
            className="motion-safe:animate-ping motion-reduce:hidden"
            style={{ animationDuration: '3s' }}
          />

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
