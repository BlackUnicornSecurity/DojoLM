// SPDX-License-Identifier: Apache-2.0
/**
 * ArenaLeaderboardSections — Achievement medals panel for /admin/arena.
 *
 * Reproduces the design's wave-b "Achievement medals" panel (Arena v2):
 * three seat rows with gold / steel / bronze medal discs (positive metals,
 * never red), seat-name titles, and short descriptions. Static content —
 * no data dependency, no hooks — so it renders at every data-state.
 *
 * The legacy "Most Used Attack Types" / "Most Successful Fixtures" bar
 * charts and the "Achievement Legend" mono-caps variant were retired: the
 * design's Kumite composition contains none of them (audit D1 / D8).
 */

import type { ReactElement } from "react";
import { Panel } from "@/design";

type MedalTier = "gold" | "steel" | "bronze";

// Seat rows keyed by medal tier. Copy is verbatim from the design ref.
const ACHIEVEMENT_MEDALS: readonly {
  readonly tier: MedalTier;
  readonly n: number;
  readonly seat: string;
  readonly desc: string;
}[] = [
  {
    tier: "gold",
    n: 1,
    seat: "First seat",
    desc: "Highest win rate across the leaderboard.",
  },
  {
    tier: "steel",
    n: 2,
    seat: "Second seat",
    desc: "Runner-up by win rate.",
  },
  {
    tier: "bronze",
    n: 3,
    seat: "Third seat",
    desc: "Third-ranked fighter on the leaderboard.",
  },
];

export function AchievementLegend(): ReactElement {
  return (
    <Panel
      headingLevel={2}
      title="Achievement medals"
      sub="Awarded across the leaderboard and roster"
    >
      <div
        className="drows"
        data-testid="arena-achievement-legend"
        role="list"
        aria-label="Achievement medals"
      >
        {ACHIEVEMENT_MEDALS.map((m) => (
          <div
            key={m.tier}
            className="drow"
            role="listitem"
            data-testid={`arena-legend-${m.tier}`}
            aria-label={`${m.seat}: ${m.desc}`}
            style={{ alignItems: "center" }}
          >
            <span
              className={`medal ${m.tier}`}
              data-testid={`arena-legend-${m.tier}-medal`}
              aria-hidden="true"
            >
              {m.n}
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="mt">{m.seat}</span>
              <span className="ms">{m.desc}</span>
            </span>
            <span className="v dim">—</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
