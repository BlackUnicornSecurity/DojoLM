// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';
import { StepStrip, type StepItem } from '../workbench/StepStrip';

export type LiveProgressState =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'done'
  | 'error'
  | 'unavailable';

export interface LiveProgressProps {
  readonly state: LiveProgressState;
  readonly runId: string;
  readonly modelIds: readonly string[];
  readonly steps: readonly StepItem[];
  readonly message?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

// Human-readable state labels. Kept here (not inferred from the enum)
// so copy changes don't flow through the type system.
const STATE_LABEL: Readonly<Record<LiveProgressState, string>> = {
  idle: 'idle',
  connecting: 'connecting',
  streaming: 'streaming',
  done: 'done',
  error: 'error',
  unavailable: 'stream unavailable',
};

// LiveProgress — SSE-driven race status panel.
// Server-safe: no EventSource here. The caller owns the subscription and
// passes the derived state in as props. This keeps the primitive free of
// SSR / hydration hazards and lets tests render any state deterministically.
export function LiveProgress({
  state,
  runId,
  modelIds,
  steps,
  message,
  className = '',
  style,
}: LiveProgressProps) {
  return (
    <section
      className={`arena-live-progress ${className}`.trim()}
      style={style}
      aria-label="Live race progress"
      aria-live="polite"
      data-testid="arena-live-progress"
      data-state={state}
    >
      <div className="arena-live-progress-head">
        <span>Live race</span>
        <span
          className={`arena-live-progress-state state-${state}`}
          data-testid="arena-live-progress-state"
        >
          <span className="arena-live-progress-dot" aria-hidden="true" />
          {STATE_LABEL[state]}
        </span>
      </div>
      <dl className="arena-live-progress-meta">
        <dt>Run</dt>
        <dd>{runId}</dd>
        <dt>Models</dt>
        <dd>{modelIds.length}</dd>
        {message !== undefined && (
          <>
            <dt>Note</dt>
            <dd>{message}</dd>
          </>
        )}
      </dl>
      {steps.length > 0 && <StepStrip items={steps} ariaLabel="Race steps" />}
    </section>
  );
}
