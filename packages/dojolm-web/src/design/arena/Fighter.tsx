// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';
import { BeltDisc, type Belt } from './BeltDisc';

export interface FighterProps {
  readonly name: string;
  readonly modelId: string;
  readonly belt?: Belt;
  readonly score?: number | string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

// One fighter row. Composed by <Match> and <Leaderboard>.
// Server-safe: no hooks, no client state.
export function Fighter({
  name,
  modelId,
  belt = 'unranked',
  score,
  className = '',
  style,
}: FighterProps) {
  return (
    <div
      className={`arena-fighter ${className}`.trim()}
      style={style}
      data-testid="arena-fighter"
    >
      <BeltDisc belt={belt} />
      <div className="arena-fighter-body">
        <span className="arena-fighter-name">{name}</span>
        <span className="arena-fighter-model">{modelId}</span>
      </div>
      {score !== undefined && (
        <span className="arena-fighter-score" aria-label={`score ${score}`}>
          {score}
        </span>
      )}
    </div>
  );
}
