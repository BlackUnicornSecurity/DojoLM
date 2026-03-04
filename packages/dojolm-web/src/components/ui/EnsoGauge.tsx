'use client'

/**
 * File: EnsoGauge.tsx
 * Purpose: Circular arc SVG gauge with calligraphic brush-stroke style (enso circle)
 * Story: TPI-NODA-9.8
 * Index:
 * - EnsoGaugeProps (line 13)
 * - EnsoGauge component (line 23)
 */

import { cn } from '@/lib/utils'

interface EnsoGaugeProps {
  /** Current value */
  value: number
  /** Maximum value (default 100) */
  max?: number
  /** SVG size in pixels (default 128) */
  size?: number
  /** Stroke color (default: --dojo-primary) */
  color?: string
  /** Label text shown below the value */
  label?: string
  /** Additional class name */
  className?: string
}

/**
 * EnsoGauge — Circular arc SVG mimicking a traditional enso brush stroke.
 * Open at top-right ("always room for improvement").
 * Uses stroke-dasharray + stroke-dashoffset for animated fill.
 */
export function EnsoGauge({ value, max = 100, size = 128, color = 'var(--dojo-primary)', label, className }: EnsoGaugeProps) {
  const strokeWidth = size * 0.08
  const radius = (size - strokeWidth) / 2
  const center = size / 2

  // Arc covers 270 degrees (open at top-right for enso gap)
  const arcDegrees = 270
  const circumference = 2 * Math.PI * radius
  const arcLength = (arcDegrees / 360) * circumference

  const clampedValue = Math.max(0, Math.min(value, max))
  const fillRatio = max > 0 ? clampedValue / max : 0
  const dashOffset = arcLength * (1 - fillRatio)

  // Start at 135 degrees (bottom-left) and sweep 270 degrees clockwise
  const startAngle = 135
  const endAngle = startAngle + arcDegrees
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180

  const x1 = center + radius * Math.cos(startRad)
  const y1 = center + radius * Math.sin(startRad)
  const x2 = center + radius * Math.cos(endRad)
  const y2 = center + radius * Math.sin(endRad)

  // SVG arc: large arc flag = 1 (270 > 180)
  const arcPath = `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2}`

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        role="img"
        aria-label={`Gauge showing ${clampedValue} out of ${max}${label ? `, ${label}` : ''}`}
      >
        {/* Background track */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc — variable width stroke for brush-stroke effect */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out"
        />

        {/* Center value text */}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-bold fill-current text-foreground"
          style={{ fontSize: size * 0.22 }}
        >
          {clampedValue}
        </text>

        {label && (
          <text
            x={center}
            y={center + size * 0.14}
            textAnchor="middle"
            className="fill-current text-muted-foreground"
            style={{ fontSize: size * 0.09 }}
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  )
}
