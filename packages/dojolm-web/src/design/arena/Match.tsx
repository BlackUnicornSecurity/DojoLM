// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, ReactNode } from 'react';
import { Fighter, type FighterProps } from './Fighter';

export interface MatchProps {
  readonly title?: ReactNode;
  readonly meta?: ReactNode;
  readonly fighters: readonly FighterProps[];
  readonly className?: string;
  readonly style?: CSSProperties;
}

// Match — N-up fixture slot (typically 2-up). Renders a labeled group of
// <Fighter> rows. Used by <ModelGridLiveRace> for head-to-head races and
// by the canvas artboards for representative matchups.
export function Match({
  title,
  meta,
  fighters,
  className = '',
  style,
}: MatchProps) {
  return (
    <div
      className={`arena-match ${className}`.trim()}
      style={style}
      data-testid="arena-match"
    >
      {(title || meta) && (
        <div className="arena-match-head">
          {title ? <span>{title}</span> : <span />}
          {meta ? <span>{meta}</span> : null}
        </div>
      )}
      <div>
        {fighters.map((f) => (
          <Fighter key={`${f.name}:${f.modelId}`} {...f} />
        ))}
      </div>
    </div>
  );
}
