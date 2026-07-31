// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';
import { Fighter, type FighterProps } from './Fighter';

export interface LeaderboardProps {
  readonly rows: readonly FighterProps[];
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

// Leaderboard — ranked list of fighters. Rank index starts at 1.
// Semantic <ol> so assistive tech reads the ordering.
export function Leaderboard({
  rows,
  className = '',
  style,
  ariaLabel = 'Leaderboard',
}: LeaderboardProps) {
  return (
    <ol
      className={`arena-leaderboard ${className}`.trim()}
      style={style}
      aria-label={ariaLabel}
      data-testid="arena-leaderboard"
    >
      {rows.map((row, i) => (
        <li
          key={`${row.name}:${row.modelId}`}
          className="arena-leaderboard-row"
        >
          <span
            className="arena-leaderboard-rank"
            aria-label={`rank ${i + 1}`}
          >
            #{i + 1}
          </span>
          <Fighter {...row} />
        </li>
      ))}
    </ol>
  );
}
