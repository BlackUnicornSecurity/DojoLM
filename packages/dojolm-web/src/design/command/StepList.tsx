// SPDX-License-Identifier: Apache-2.0
import { I } from '../shell/icons';

export interface Step {
  title: string;
  sub?: string;
  done?: boolean;
}

export interface StepListProps {
  steps: Step[];
  variant?: 'dark' | 'paper';
}

export function StepList({ steps, variant = 'dark' }: StepListProps) {
  return (
    <div className={`steplist ${variant}`}>
      {steps.map((s, i) => (
        <div key={i} className={`step ${s.done ? 'done' : ''}`.trim()}>
          <div className="step-num">
            {s.done ? I.check : String(i + 1).padStart(2, '0')}
          </div>
          <div className="step-body">
            <b>{s.title}</b>
            {s.sub && <span>{s.sub}</span>}
          </div>
          <div className="step-arrow">{I.arrow}</div>
        </div>
      ))}
    </div>
  );
}
