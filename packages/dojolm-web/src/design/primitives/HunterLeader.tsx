// SPDX-License-Identifier: Apache-2.0
import { cap } from './_caps';
import { BeltDisc, type Belt } from '../arena/BeltDisc';

export type HunterLeaderTag = '' | 'elite' | 'veteran' | 'rookie';

export interface HunterLeaderProps {
  /** Leaderboard rank (1-based). Top-3 render with gold-tinted chip; 4+ muted. */
  rank: number;
  /** Hunter handle (mono — e.g. "@shadowfang"). */
  handle: string;
  /** Bounty count submitted in the active period. */
  bounties: number;
  /** Pre-formatted payout total (e.g. "$8,200"). */
  payout: string;
  /** Belt tier — drives the BeltDisc color disc on the right edge. */
  belt: Belt;
  /** Optional class chip (elite / veteran / rookie). */
  tag?: HunterLeaderTag;
  /** Optional points value rendered between handle and tag (e.g. 2840). */
  points?: number;
}

/**
 * Defensive cap on leaderboard rows for consuming panels. UI envelope is
 * paged at ~50 rows; this is the array slice the caller should apply
 * before mapping `HunterLeader` rows into the list parent.
 */
export const HUNTER_LEADERBOARD_MAX_ROWS = 100;

const HANDLE_MAX = 64;
const PAYOUT_MAX = 32;

const TAG_LABEL: Record<Exclude<HunterLeaderTag, ''>, string> = {
  elite: 'ELITE',
  veteran: 'VETERAN',
  rookie: 'ROOKIE',
};

/**
 * Static aria-label fragments for each belt tier. The summary string
 * indexes this map rather than splicing the raw `belt` value into the
 * accessible name — defends against runtime widening (e.g. JSON cast
 * `as Belt`) carrying attacker-controlled text into the AT layer.
 */
const BELT_ARIA_LABEL: Record<Belt, string> = {
  black: 'black belt',
  red: 'red belt',
  brown: 'brown belt',
  purple: 'purple belt',
  blue: 'blue belt',
  green: 'green belt',
  orange: 'orange belt',
  yellow: 'yellow belt',
  white: 'white belt',
  unranked: 'unranked',
};

/**
 * Pliny-style hunter leaderboard row for Ronin. Rank chip + handle / pts /
 * tag column + payout / belt right edge. Renders as `role="listitem"` so
 * the consuming `<HunterLeader>` list (or wrapping panel) carries the
 * `role="list"` landmark — matches the DiffBlock decorative-nesting
 * convention.
 */
export function HunterLeader({
  rank,
  handle,
  bounties,
  payout,
  belt,
  tag = '',
  points,
}: HunterLeaderProps) {
  const safeRank = Math.max(1, Math.floor(rank));
  const safeHandle = cap(handle, HANDLE_MAX);
  const safePayout = cap(payout, PAYOUT_MAX);
  const safeBounties = Math.max(0, Math.floor(bounties));
  const safePoints = points !== undefined ? Math.max(0, Math.floor(points)) : undefined;
  const tier = safeRank === 1 ? 'gold-1' : safeRank <= 3 ? 'gold-2' : 'plain';
  const summary = [
    `Rank ${safeRank}`,
    safeHandle,
    `${safeBounties} bounties`,
    `${safePayout} paid`,
    BELT_ARIA_LABEL[belt] ?? 'unranked',
  ].join(' · ');
  return (
    <div
      className={`hunter-leader rank-${tier}`}
      role="listitem"
      aria-label={summary}
    >
      <span className={`hunter-leader-rank tier-${tier}`} aria-hidden="true">
        {safeRank}
      </span>
      <span className="hunter-leader-body">
        <b className="hunter-leader-handle">{safeHandle}</b>
        <span className="hunter-leader-meta">
          {safePoints !== undefined && (
            <span className="hunter-leader-pts">{safePoints.toLocaleString()} pts</span>
          )}
          <span className="hunter-leader-bounties">{safeBounties} bounties</span>
          {tag && (
            <span className={`hunter-leader-tag ${tag}`}>{TAG_LABEL[tag]}</span>
          )}
        </span>
      </span>
      <span className="hunter-leader-payout">{safePayout}</span>
      <BeltDisc belt={belt} className="hunter-leader-belt" />
    </div>
  );
}

// Re-export Belt for downstream consumers that don't import arena directly.
export type { Belt };
