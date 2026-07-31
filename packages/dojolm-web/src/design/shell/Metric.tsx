// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';
import { I } from './icons';

export type MetricTone = '' | 'red' | 'steel' | 'gold' | 'jade';

export interface MetricDelta {
  text: ReactNode;
  kind?: '' | 'neg' | 'flat';
}

export interface MetricProps {
  k: ReactNode;
  v: ReactNode;
  unit?: ReactNode;
  delta?: MetricDelta;
  tone?: MetricTone;
  icon?: ReactNode;
  /** Dim sub-caption under the value (design `.kpi .d`, e.g. "in the
   *  registry"). Rendered only when no `delta` occupies the slot. */
  sub?: ReactNode;
}

export function Metric({ k, v, unit, delta, tone = '', icon, sub }: MetricProps) {
  return (
    <div className={`mcard ${tone}`.trim()}>
      <div className="k">
        <span>{k}</span>
        {icon && <span style={{ color: 'var(--fg-mute)' }}>{icon}</span>}
      </div>
      <div className="v">
        {v}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta && (
        <div className={`d ${delta.kind || 'pos'}`}>
          {delta.kind === 'neg' ? I.down : delta.kind === 'flat' ? null : I.up}
          <span>{delta.text}</span>
        </div>
      )}
      {!delta && sub && <div className="d">{sub}</div>}
    </div>
  );
}
