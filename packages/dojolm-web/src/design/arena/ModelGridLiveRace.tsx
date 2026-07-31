// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';

export type ModelRaceState =
  | 'pending'
  | 'running'
  | 'ok'
  | 'fail'
  | 'skipped';

export interface ModelRaceCell {
  readonly modelId: string;
  readonly state: ModelRaceState;
  readonly note?: string;
}

export interface ModelGridLiveRaceProps {
  readonly models: readonly string[];
  readonly cells: readonly ModelRaceCell[];
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

// ModelGridLiveRace — N-up grid of per-model race state cells.
// `models` drives the render order (so the grid is stable across re-renders
// even if SSE events arrive out of order). `cells` is a shape-validated
// per-model slice from the page-owned SSE subscription; missing rows fall
// back to `pending`.
export function ModelGridLiveRace({
  models,
  cells,
  className = '',
  style,
  ariaLabel = 'Per-model race progress',
}: ModelGridLiveRaceProps) {
  const byId = new Map(cells.map((c) => [c.modelId, c] as const));
  return (
    <div
      role="grid"
      aria-label={ariaLabel}
      className={`arena-model-grid ${className}`.trim()}
      style={style}
      data-testid="arena-model-grid"
    >
      {models.map((id) => {
        const cell = byId.get(id);
        const state: ModelRaceState = cell?.state ?? 'pending';
        return (
          <div
            key={id}
            role="gridcell"
            className={`arena-model-cell state-${state}`}
            data-state={state}
            data-testid="arena-model-cell"
          >
            <div className="arena-model-cell-head">
              <span className="arena-model-cell-id">{id}</span>
              <span className="arena-model-cell-state">{state}</span>
            </div>
            {cell?.note !== undefined && (
              <span className="arena-model-cell-note">{cell.note}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
