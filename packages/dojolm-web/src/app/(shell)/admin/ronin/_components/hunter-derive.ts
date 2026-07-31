// SPDX-License-Identifier: Apache-2.0
/**
 * Hunter-row derivation + rank-tier helpers for the Ronin Hub leaderboard.
 *
 * Extracted from `RoninAdminClient.tsx` per architect Q4 (PR #3 of the
 * Phase 2 polish wave). Pure functions — no I/O, no clock, no React.
 * Unit-testable in isolation.
 */

import {
  HUNTER_LEADERBOARD_MAX_ROWS,
  type Belt,
  type HunterLeaderTag,
} from '@/design/primitives/HunterLeader';
import type { HunterRow, SubmissionLite, SubmissionSeverity } from './types';

/**
 * Severity numerical rank — used as a sort comparator both inside
 * `deriveHunters` (for hunter ordering) and inside the orchestrator's
 * `queueRows` useMemo (for triage queue ordering). Exported so the
 * orchestrator can share the canonical ordering.
 */
export const SEVERITY_RANK: Record<SubmissionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/**
 * Hunter rank → belt tier mapping. Mirrors the BELT_TIERS ladder; cap
 * the projection at the existing 9-tier vocabulary so a runtime
 * widening (`as Belt`) cannot inject attacker text into the AT layer.
 */
const HUNTER_RANK_TO_BELT: readonly Belt[] = [
  'black',
  'red',
  'brown',
  'purple',
  'blue',
  'green',
  'orange',
  'yellow',
  'white',
];

const HUNTER_RANK_TO_TAG: Record<'top' | 'mid' | 'rest', HunterLeaderTag> = {
  top: 'elite',
  mid: 'veteran',
  rest: 'rookie',
};

export const MAX_RONIN_HUNTERS_DISPLAYED = HUNTER_LEADERBOARD_MAX_ROWS;

/**
 * Synthesize hunter rows from a submission stream.
 *
 * The submission shape doesn't carry a hunter id (the YR.1.6 store is
 * per-operator, not per-hunter), so we synthesize a deterministic
 * hunter handle from `programId` so the leaderboard stays stable
 * across renders. This mirrors how the V1 Ronin tab fans out fixture
 * data — the page surfaces the operator hierarchy by program owner.
 */
export function deriveHunters(
  submissions: readonly SubmissionLite[],
): readonly HunterRow[] {
  const buckets = new Map<string, HunterRow>();
  for (const s of submissions) {
    const handle = `@${s.programId}`;
    const cur = buckets.get(handle);
    const payoutInc = s.payout ?? 0;
    if (!cur) {
      buckets.set(handle, {
        handle,
        bounties: 1,
        payout: payoutInc,
        maxSev: s.severity,
        points: Math.round(s.finalScore * 10),
      });
    } else {
      const maxSev =
        SEVERITY_RANK[s.severity] > SEVERITY_RANK[cur.maxSev] ? s.severity : cur.maxSev;
      buckets.set(handle, {
        handle,
        bounties: cur.bounties + 1,
        payout: cur.payout + payoutInc,
        maxSev,
        points: cur.points + Math.round(s.finalScore * 10),
      });
    }
  }
  return Array.from(buckets.values())
    .sort((a, b) => {
      const sevDelta = SEVERITY_RANK[b.maxSev] - SEVERITY_RANK[a.maxSev];
      if (sevDelta !== 0) return sevDelta;
      const payoutDelta = b.payout - a.payout;
      if (payoutDelta !== 0) return payoutDelta;
      return b.bounties - a.bounties;
    })
    .slice(0, MAX_RONIN_HUNTERS_DISPLAYED);
}

/**
 * Map a 1-based rank to a belt tier. Ranks beyond the 9-tier
 * vocabulary fall to `'unranked'` to keep the closed `Belt` union
 * honest.
 */
export function rankToBelt(rank: number): Belt {
  const idx = Math.max(0, rank - 1);
  return idx < HUNTER_RANK_TO_BELT.length ? HUNTER_RANK_TO_BELT[idx] : 'unranked';
}

/**
 * Map a 1-based rank + total cohort size to an elite/veteran/rookie
 * tag. Top quartile = elite; top half = veteran; rest = rookie.
 */
export function rankToTag(rank: number, total: number): HunterLeaderTag {
  if (total === 0) return '';
  if (rank <= Math.max(1, Math.floor(total / 4))) return HUNTER_RANK_TO_TAG.top;
  if (rank <= Math.max(2, Math.floor(total / 2))) return HUNTER_RANK_TO_TAG.mid;
  return HUNTER_RANK_TO_TAG.rest;
}
