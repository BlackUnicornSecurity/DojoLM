'use client'

/**
 * File: FeatureRadar.tsx
 * Purpose: SVG radar chart comparing target vs candidate feature vectors
 * Story: K5.4
 * Index:
 * - RadarAxis type (line ~20)
 * - FeatureRadarProps interface (line ~25)
 * - polarToCartesian helper (line ~45)
 * - FeatureRadar component (line ~55)
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RadarAxis {
  readonly label: string
  readonly key: string
}

export interface FeatureRadarProps {
  /** Axis definitions (8-10 recommended) */
  readonly axes: readonly RadarAxis[]
  /** Target values [0..1] per axis key */
  readonly targetValues: Readonly<Record<string, number>>
  /** Candidate values [0..1] per axis key */
  readonly candidateValues: Readonly<Record<string, number>>
  /** Target label for legend */
  readonly targetLabel?: string
  /** Candidate label for legend */
  readonly candidateLabel?: string
  /** Chart size in px */
  readonly size?: number
  readonly className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { readonly x: number; readonly y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

function buildPolygonPoints(
  axes: readonly RadarAxis[],
  values: Readonly<Record<string, number>>,
  cx: number,
  cy: number,
  maxRadius: number,
): string {
  return axes
    .map((axis, i) => {
      const angle = (360 / axes.length) * i
      const val = Math.max(0, Math.min(1, values[axis.key] ?? 0))
      const pt = polarToCartesian(cx, cy, maxRadius * val, angle)
      return `${pt.x},${pt.y}`
    })
    .join(' ')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureRadar({
  axes,
  targetValues,
  candidateValues,
  targetLabel = 'Target',
  candidateLabel = 'Top Candidate',
  size = 320,
  className,
}: FeatureRadarProps) {
  const cx = size / 2
  const cy = size / 2
  const maxRadius = size * 0.38
  const rings = [0.25, 0.5, 0.75, 1.0]

  const targetPoints = useMemo(
    () => buildPolygonPoints(axes, targetValues, cx, cy, maxRadius),
    [axes, targetValues, cx, cy, maxRadius],
  )

  const candidatePoints = useMemo(
    () => buildPolygonPoints(axes, candidateValues, cx, cy, maxRadius),
    [axes, candidateValues, cx, cy, maxRadius],
  )

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Feature comparison radar chart"
      >
        {/* Grid rings */}
        {rings.map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={maxRadius * r}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Axis lines + labels */}
        {axes.map((axis, i) => {
          const angle = (360 / axes.length) * i
          const endPt = polarToCartesian(cx, cy, maxRadius, angle)
          const labelPt = polarToCartesian(cx, cy, maxRadius + 18, angle)
          const tVal = targetValues[axis.key] ?? 0
          const cVal = candidateValues[axis.key] ?? 0

          return (
            <g key={axis.key}>
              <line
                x1={cx}
                y1={cy}
                x2={endPt.x}
                y2={endPt.y}
                stroke="var(--border-subtle)"
                strokeWidth={0.5}
                opacity={0.4}
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                fontSize={10}
                aria-hidden="true"
              >
                <title>{`${axis.label}: target=${(tVal * 100).toFixed(0)}%, candidate=${(cVal * 100).toFixed(0)}%`}</title>
                {axis.label}
              </text>
            </g>
          )
        })}

        {/* Target polygon (blue) */}
        <polygon
          points={targetPoints}
          fill="color-mix(in srgb, var(--info) 15%, transparent)"
          stroke="var(--info)"
          strokeWidth={1.5}
        />

        {/* Candidate polygon (green) */}
        <polygon
          points={candidatePoints}
          fill="color-mix(in srgb, var(--success) 15%, transparent)"
          stroke="var(--success)"
          strokeWidth={1.5}
        />

        {/* Data points — target */}
        {axes.map((axis, i) => {
          const angle = (360 / axes.length) * i
          const val = Math.max(0, Math.min(1, targetValues[axis.key] ?? 0))
          const pt = polarToCartesian(cx, cy, maxRadius * val, angle)
          return (
            <circle
              key={`t-${axis.key}`}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill="var(--info)"
            >
              <title>{`${axis.label}: ${(val * 100).toFixed(0)}%`}</title>
            </circle>
          )
        })}

        {/* Data points — candidate */}
        {axes.map((axis, i) => {
          const angle = (360 / axes.length) * i
          const val = Math.max(0, Math.min(1, candidateValues[axis.key] ?? 0))
          const pt = polarToCartesian(cx, cy, maxRadius * val, angle)
          return (
            <circle
              key={`c-${axis.key}`}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill="var(--success)"
            >
              <title>{`${axis.label}: ${(val * 100).toFixed(0)}%`}</title>
            </circle>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--info)' }} />
          {targetLabel}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--success)' }} />
          {candidateLabel}
        </div>
      </div>
    </div>
  )
}
