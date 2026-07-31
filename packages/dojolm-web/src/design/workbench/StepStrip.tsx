// SPDX-License-Identifier: Apache-2.0
export type StepState = 'pending' | 'running' | 'ok' | 'fail' | 'skipped';

export interface StepItem {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
}

export interface StepStripProps {
  readonly items: readonly StepItem[];
  readonly className?: string;
  readonly ariaLabel?: string;
}

// Bottom progress track. Rendered as an ordered list so assistive tech
// reads the sequence. State classes come from patterns/workbench.css.
export function StepStrip({
  items,
  className = '',
  ariaLabel = 'Run steps',
}: StepStripProps) {
  return (
    <ol
      className={`wb-steps ${className}`.trim()}
      aria-label={ariaLabel}
      data-testid="workbench-step-strip"
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={`wb-step state-${item.state}`}
          data-state={item.state}
          aria-label={`${item.label}: ${item.state}`}
        >
          <span className="wb-step-marker" aria-hidden="true" />
          <span className="wb-step-label">{item.label}</span>
        </li>
      ))}
    </ol>
  );
}
