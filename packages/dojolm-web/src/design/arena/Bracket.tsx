// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

export type BracketWinner = 'a' | 'b' | null;

export interface BracketMatch {
  /** Stable id (used as React key + DOM id). */
  readonly id: string;
  /** Side A label. Capped at 60 chars at the prop boundary. */
  readonly a: string;
  /** Side B label. Capped at 60 chars at the prop boundary. */
  readonly b: string;
  /** `'a'` highlights A, `'b'` highlights B, `null` = pending. */
  readonly winner?: BracketWinner;
  /** Optional score string (e.g. `"4-2"`). Capped at 16 chars. */
  readonly score?: string;
}

export interface BracketRound {
  /** Stable id (used as React key to avoid name collisions). */
  readonly id: string;
  /** Round label (e.g. `"Round 1"`, `"Final"`). Capped at 32 chars. */
  readonly name: string;
  readonly matches: readonly BracketMatch[];
}

export interface BracketProps {
  readonly rounds: readonly BracketRound[];
  /** Accessible label override. Default summarizes round + match counts. */
  readonly ariaLabel?: string;
  readonly className?: string;
  /** Stable test id. Defaults to `arena-bracket`. */
  readonly testId?: string;
}

const MAX_LABEL = 60;
const MAX_SCORE = 16;
const MAX_ROUND = 32;
/** Render-time caps to defend against unbounded API responses (DoS). */
export const BRACKET_MAX_ROUNDS = 64;
export const BRACKET_MAX_MATCHES_PER_ROUND = 128;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Tournament bracket — pure CSS-grid layout (no D3, no canvas). Each
 * round renders as a column; matches stack vertically with mono-font
 * fighter labels and an optional score chip. Winner side gets a torii-
 * red accent border. Sighted users see the bracket; AT consumers get
 * a sentence summary via the wrapper `role="figure"` aria-label.
 */
export function Bracket({ rounds, ariaLabel, className, testId }: BracketProps) {
  const safeRounds = rounds.slice(0, BRACKET_MAX_ROUNDS);
  const totalMatches = safeRounds.reduce(
    (s, r) => s + Math.min(r.matches.length, BRACKET_MAX_MATCHES_PER_ROUND),
    0,
  );
  const summary =
    ariaLabel ?? `Bracket: ${safeRounds.length} rounds, ${totalMatches} matches`;
  const rootClass = `arena-bracket${className ? ` ${className}` : ''}`;

  if (safeRounds.length === 0) {
    return (
      <div
        className={rootClass}
        role="figure"
        aria-label={summary}
        data-testid={testId ?? 'arena-bracket'}
        data-empty="true"
      />
    );
  }

  return (
    <div
      className={rootClass}
      role="figure"
      aria-label={summary}
      data-testid={testId ?? 'arena-bracket'}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${safeRounds.length}, minmax(0, 1fr))`,
      }}
    >
      {safeRounds.map((round) => {
        const safeMatches = round.matches.slice(0, BRACKET_MAX_MATCHES_PER_ROUND);
        return (
          <div className="arena-bracket-round" key={round.id}>
            <div className="arena-bracket-round-name">{cap(round.name, MAX_ROUND)}</div>
            <div className="arena-bracket-matches">
              {safeMatches.map((m) => (
                <BracketMatchView key={m.id} match={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BracketMatchView({ match }: { match: BracketMatch }): ReactNode {
  const aClass = `arena-bracket-side${match.winner === 'a' ? ' winner' : ''}${match.winner === 'b' ? ' loser' : ''}`;
  const bClass = `arena-bracket-side${match.winner === 'b' ? ' winner' : ''}${match.winner === 'a' ? ' loser' : ''}`;
  return (
    <div className="arena-bracket-match" data-match-id={match.id}>
      <div className={aClass}>{cap(match.a, MAX_LABEL)}</div>
      <div className={bClass}>{cap(match.b, MAX_LABEL)}</div>
      {match.score ? (
        <div className="arena-bracket-score" aria-hidden="true">
          {cap(match.score, MAX_SCORE)}
        </div>
      ) : null}
    </div>
  );
}
