// SPDX-License-Identifier: Apache-2.0
/**
 * HunterLeaderboardPanel — Ronin Hub hunter ranking panel.
 *
 * Extracted from `RoninAdminClient.tsx` per the >800 LOC split (PR #3).
 * Pure presentational — caller passes the already-derived hunter rows
 * and a payout formatter; this component renders the ordered list of
 * `<HunterLeader>` rows.
 *
 * Narrow direct-component-path imports per
 * the darwin-perf import rule.
 */

import type { ReactElement } from 'react';
import { HunterLeader } from '@/design/primitives/HunterLeader';
// Architect LOW-1 fix — canonical `HunterRow` lives in
// `./types.ts` (carries `maxSev` for the orchestrator's sort
// comparator). The panel reads only display fields but the wire
// type is single-source-of-truth.
import type { HunterRow } from './types';
// Aggregate-audit fix (architect LOW-2) — `rankToBelt` + `rankToTag`
// are pure module exports from `./hunter-derive.ts` (no closure over
// orchestrator state). Inject directly instead of as props — the
// dependency-injection achieved nothing since the orchestrator always
// passed the same two functions. `payoutFmt` stays as a prop because
// it lives on the orchestrator (closes over `CURRENCY_SYMBOL` +
// `formatNumber` per the SSR-portability rationale).
import { rankToBelt, rankToTag } from './hunter-derive';

export interface HunterLeaderboardPanelProps {
  readonly hunters: readonly HunterRow[];
  readonly payoutFmt: (payout: number, currency: string) => string;
}

export function HunterLeaderboardPanel({
  hunters,
  payoutFmt,
}: HunterLeaderboardPanelProps): ReactElement {
  if (hunters.length === 0) {
    return (
      <p className="wb-hint" data-testid="ronin-hunters-empty">
        No hunters surfaced yet.
      </p>
    );
  }
  return (
    <ol
      className="yr4-hunter-stack"
      role="list"
      aria-label="Ronin hunter leaderboard"
      data-testid="ronin-hunter-list"
    >
      {hunters.map((h, i) => (
        <HunterLeader
          key={h.handle}
          rank={i + 1}
          handle={h.handle}
          bounties={h.bounties}
          payout={payoutFmt(h.payout, 'USD')}
          belt={rankToBelt(i + 1)}
          tag={rankToTag(i + 1, hunters.length)}
          points={h.points}
        />
      ))}
    </ol>
  );
}
