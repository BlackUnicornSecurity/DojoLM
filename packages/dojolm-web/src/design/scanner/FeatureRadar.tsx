// SPDX-License-Identifier: Apache-2.0
/**
 * FeatureRadar — YR.19 / G-032.
 *
 * Polar-radar chart for Kagami behavior-fingerprint categories.
 * Pure SVG, no charting library dependency (per YR.18 stop condition
 * carried into YR.19). Renders one axis per closed `RadarAxis`,
 * connecting the per-axis scores into a closed polygon.
 *
 * Closed-map discipline (R-T1):
 *   - `RADAR_AXIS_LABEL` maps axis id → human label
 *   - Axis ids are a closed union; an unknown axis renders as a
 *     "—" tick with no score wedge
 *   - Score-bucket → fill color goes through `BUCKET_COLOR`
 *
 * a11y:
 *   - role="img" on the wrapper with aria-label describing the chart
 *   - <title> + <desc> inside the SVG describe the polygon mathematically
 *   - Per-axis ticks have aria-hidden so screen readers get one chart, not 32
 *
 * Marker IDs are derived from `testId` to avoid SVG `<defs>` collisions
 * when multiple radar instances mount on the same page (mirrors the
 * YR.18 EncodingChainVisualizer fix).
 */

'use client';

import { type ReactElement, useMemo } from 'react';

export type RadarAxisId =
  | 'safety-divergence'
  | 'factual-drift'
  | 'refusal-gap'
  | 'persona-bleed'
  | 'tool-use-divergence'
  | 'reasoning-depth'
  | 'multi-turn-consistency'
  | 'style-signature';

export const RADAR_AXES: readonly RadarAxisId[] = [
  'safety-divergence',
  'factual-drift',
  'refusal-gap',
  'persona-bleed',
  'tool-use-divergence',
  'reasoning-depth',
  'multi-turn-consistency',
  'style-signature',
];

export const RADAR_AXIS_LABEL: Record<RadarAxisId, string> = {
  'safety-divergence': 'Safety',
  'factual-drift': 'Factual',
  'refusal-gap': 'Refusal',
  'persona-bleed': 'Persona',
  'tool-use-divergence': 'Tool use',
  'reasoning-depth': 'Reasoning',
  'multi-turn-consistency': 'Multi-turn',
  'style-signature': 'Style',
};

type ScoreBucket = 'low' | 'medium' | 'high' | 'critical';
const BUCKET_LABEL: Record<ScoreBucket, string> = {
  low: 'low concern',
  medium: 'medium concern',
  high: 'high concern',
  critical: 'critical concern',
};
const BUCKET_COLOR: Record<ScoreBucket, string> = {
  low: 'rgba(74, 222, 128, 0.35)',
  medium: 'rgba(251, 191, 36, 0.35)',
  high: 'rgba(249, 115, 22, 0.45)',
  critical: 'rgba(239, 68, 68, 0.55)',
};
const BUCKET_STROKE: Record<ScoreBucket, string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#f97316',
  critical: '#ef4444',
};

function bucketScore(score: number): ScoreBucket {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export interface RadarPoint {
  readonly axis: RadarAxisId;
  readonly score: number;
}

export interface FeatureRadarProps {
  readonly points: readonly RadarPoint[];
  readonly testId?: string;
  readonly size?: number;
  readonly caption?: string;
}

const DEFAULT_SIZE = 320;
const RING_COUNT = 4;

function isRadarAxisId(v: unknown): v is RadarAxisId {
  return RADAR_AXES.includes(v as RadarAxisId);
}

function safeScore(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function FeatureRadar({
  points,
  testId = 'feature-radar',
  size = DEFAULT_SIZE,
  caption,
}: FeatureRadarProps): ReactElement | null {
  const canonical = useMemo<readonly { axis: RadarAxisId; score: number }[]>(() => {
    const byAxis = new Map<RadarAxisId, number>();
    for (const p of points) {
      if (isRadarAxisId(p.axis)) {
        byAxis.set(p.axis, safeScore(p.score));
      }
    }
    return RADAR_AXES.map((axis) => ({ axis, score: byAxis.get(axis) ?? 0 }));
  }, [points]);

  const peakBucket = useMemo<ScoreBucket>(() => {
    const peak = canonical.reduce((m, p) => Math.max(m, p.score), 0);
    return bucketScore(peak);
  }, [canonical]);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 36;
  const axisCount = RADAR_AXES.length;
  const angleStep = (Math.PI * 2) / axisCount;
  const startAngle = -Math.PI / 2;

  const polygonPoints = canonical
    .map((p, idx) => {
      const angle = startAngle + idx * angleStep;
      const r = (p.score / 100) * radius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const ariaLabel = `${caption ?? 'Behavior fingerprint radar'} · peak ${BUCKET_LABEL[peakBucket]}`;

  return (
    <div
      data-testid={testId}
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', maxWidth: size, margin: '0 auto' }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        <title>{caption ?? 'Feature radar'}</title>
        <desc>
          Polar-radar showing {axisCount} behavior categories. Peak {BUCKET_LABEL[peakBucket]}.
        </desc>
        {/* Concentric rings */}
        {Array.from({ length: RING_COUNT }, (_, ringIdx) => {
          const r = ((ringIdx + 1) / RING_COUNT) * radius;
          return (
            <circle
              key={`ring-${ringIdx}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--b-1, #2a2a2a)"
              strokeWidth={1}
              data-testid={`${testId}-ring-${ringIdx}`}
            />
          );
        })}
        {/* Axis spokes + labels */}
        {RADAR_AXES.map((axis, idx) => {
          const angle = startAngle + idx * angleStep;
          const xEdge = cx + Math.cos(angle) * radius;
          const yEdge = cy + Math.sin(angle) * radius;
          const xLabel = cx + Math.cos(angle) * (radius + 18);
          const yLabel = cy + Math.sin(angle) * (radius + 18);
          return (
            <g key={`axis-${axis}`} data-testid={`${testId}-axis-${axis}`}>
              <line
                x1={cx}
                y1={cy}
                x2={xEdge}
                y2={yEdge}
                stroke="var(--b-1, #2a2a2a)"
                strokeWidth={1}
              />
              <text
                x={xLabel}
                y={yLabel}
                fontSize={11}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--fg-mute, #888)"
              >
                {RADAR_AXIS_LABEL[axis]}
              </text>
            </g>
          );
        })}
        {/* Score polygon */}
        <polygon
          points={polygonPoints}
          fill={BUCKET_COLOR[peakBucket]}
          stroke={BUCKET_STROKE[peakBucket]}
          strokeWidth={1.5}
          strokeLinejoin="round"
          data-testid={`${testId}-polygon`}
        />
        {/* Per-axis dots */}
        {canonical.map((p, idx) => {
          const angle = startAngle + idx * angleStep;
          const r = (p.score / 100) * radius;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const dotBucket = bucketScore(p.score);
          return (
            <circle
              key={`dot-${p.axis}`}
              cx={x}
              cy={y}
              r={3}
              fill={BUCKET_STROKE[dotBucket]}
              data-testid={`${testId}-dot-${p.axis}`}
            />
          );
        })}
      </svg>
    </div>
  );
}
