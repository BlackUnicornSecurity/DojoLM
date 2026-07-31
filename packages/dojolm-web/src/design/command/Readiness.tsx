// SPDX-License-Identifier: Apache-2.0
import { useId } from 'react';
import type { ReactNode } from 'react';

export interface ReadinessBar {
  k: ReactNode;
  v: number;
  tone?: 'jade' | 'steel' | 'gold' | 'red';
}

export interface ReadinessProps {
  score: number;
  label: ReactNode;
  bars: ReadinessBar[];
  /**
   * v2 (Yamabushi 1.2): a11y title for the SVG dial. Defaults to a
   * generated string from `score` + `label`. Override only when the
   * surrounding context already labels the dial via aria-labelledby.
   */
  ariaTitle?: string;
}

export function Readiness({ score, label, bars, ariaTitle }: ReadinessProps) {
  const circ = 2 * Math.PI * 48;
  const dash = (score / 100) * circ;
  // Unique gradient id per instance so all 4 canvas artboards render their own
  // readiness gauge without colliding on a shared #readGrad definition.
  const uid = useId();
  const gradId = `readGrad-${uid.replace(/:/g, '')}`;
  const titleId = `readTitle-${uid.replace(/:/g, '')}`;
  const labelText =
    ariaTitle ?? `${typeof label === 'string' ? label : 'Readiness'}: ${score} of 100`;
  return (
    <div className="readiness">
      <div className="readiness-gauge">
        <svg
          width="128"
          height="128"
          viewBox="0 0 128 128"
          style={{ transform: 'rotate(-90deg)' }}
          role="img"
          aria-labelledby={titleId}
        >
          <title id={titleId}>{labelText}</title>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--steel-lg)" />
              <stop offset="100%" stopColor="var(--steel)" />
            </linearGradient>
          </defs>
          <circle cx="64" cy="64" r="48" fill="none" stroke="rgba(var(--white-rgb), 0.06)" strokeWidth="7" />
          <circle
            cx="64"
            cy="64"
            r="48"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className="readiness-arc"
            style={{ filter: 'drop-shadow(0 0 6px rgba(var(--steel-rgb), 0.5))' }}
          />
        </svg>
        <div className="readiness-val">
          <b>{score}</b>
          <span>{label}</span>
        </div>
      </div>
      <div className="readiness-bars">
        {bars.map((b, i) => (
          <div key={i} className="rb">
            <span className="rb-k">{b.k}</span>
            <div className={`pbar ${b.tone ?? ''}`.trim()}>
              <div className="fill" style={{ width: `${b.v}%` }} />
            </div>
            <span className="rb-v">{b.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
