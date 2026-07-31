// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

export type MiniGaugeTone = '' | 'jade' | 'steel' | 'gold' | 'red';

export interface MiniGaugeProps {
  pct: number;
  tone?: MiniGaugeTone;
  label?: ReactNode;
  /** Optional accessible label override for the gauge. */
  ariaLabel?: string;
}

/**
 * Inline circular 64px gauge. Driven entirely by CSS (conic-gradient
 * + the `--pct` custom property) so the visual stays deterministic
 * without inline SVG math. `pct` is clamped to [0, 100].
 */
export function MiniGauge({ pct, tone = '', label, ariaLabel }: MiniGaugeProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="minigauge-row">
      <div
        className={`minigauge ${tone}`.trim()}
        style={{ '--pct': clamped } as React.CSSProperties}
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : `${clamped}%`)}
      >
        <b>{clamped}</b>
      </div>
      {label && <div className="minigauge-label">{label}</div>}
    </div>
  );
}
