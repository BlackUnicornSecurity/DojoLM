// SPDX-License-Identifier: Apache-2.0
/**
 * MembersScentGrid — factual surface index for /members post-auth home.
 *
 * Retires F-3-002 (P0): the prior placeholder claimed leaderboard /
 * seasons / bounty surfaces were "coming soon" even though all four
 * routes shipped. This component replaces the lying placeholder with a
 * compact index that links members straight to the surfaces they
 * came to use.
 *
 * Composition follows the v2 corpus (wave-c "Members Home v2.html"):
 * a `.cat-card` grid — `.top` (title + "At launch" badge), a `.code`
 * mono romaji sub-caption, `.desc`, and a `.stat-row` facts footer.
 * Every pre-launch number/string in the stat rows sources from
 * MEMBER_PRELAUNCH_FACTS (D-07 copy contract) so sibling surfaces can
 * never disagree.
 *
 * P2d D3 — titles, `.code` sub-captions, and descriptions are the
 * reference's copy VERBATIM (wave-c Members Home v2.html:65-88); the
 * earlier verb-led rewrites are retired.
 */

import { MEMBER_PRELAUNCH_FACTS as FACTS } from "@/lib/demo/demo-facts";

interface ScentCard {
  readonly id: string;
  readonly href: `/members/${string}`;
  readonly title: string;
  /** `.code` mono sub-caption — romaji half (rendered mono-caps by CSS). */
  readonly code: string;
  /** Optional kanji half of the sub-caption (`lang="ja"`, aria-hidden). */
  readonly kanji?: string;
  readonly body: string;
  /** `.stat-row` footer line — composed from MEMBER_PRELAUNCH_FACTS only. */
  readonly facts: string;
}

const CARDS: readonly ScentCard[] = [
  {
    id: "leaderboard",
    href: "/members/leaderboard",
    title: "Leaderboard",
    code: "Standings",
    body: "Season standings for verified bypasses — who found what, ranked.",
    facts: `${FACTS.seasonChip} · ${FACTS.verifiedBypasses} verified bypasses`,
  },
  {
    id: "seasons",
    href: "/members/seasons",
    title: "Seasons",
    code: "Kisetsu",
    kanji: "季節",
    body: "Competition seasons and archives.",
    facts: FACTS.seasonChip,
  },
  {
    // eslint-disable-next-line no-restricted-syntax -- member surface id, not a retired admin navigation id
    id: "bounty",
    href: "/members/bounty",
    title: "Bounty",
    code: "Houbi",
    kanji: "褒美",
    body: "Rewards for verified bypasses.",
    facts: `${FACTS.payoutsMade} payouts made · amounts “${FACTS.payoutAmount}” until rules publish`,
  },
  {
    id: "bypass-matrix",
    href: "/members/leaderboard/bypass-matrix",
    title: "Bypass matrix",
    code: "Attack results",
    body: "Which submitted attacks bypass which models — the public results grid.",
    facts: `${FACTS.verifiedBypasses} verified results · ${FACTS.modelsNote}`,
  },
];

export interface MembersScentGridProps {
  /** Optional override for the test root id. */
  readonly testId?: string;
}

/**
 * Renders the four-surface index as the corpus `.cat-card` grid. Cards
 * are `<div>`s per the corpus (wave-c Members Home v2.html:65-83 — the
 * card is informational chrome, never one big anchor); the title is the
 * link, so the click target stays a single-line control (hallmark
 * responsive contract: interactive text never wraps).
 */
export function MembersScentGrid({
  testId = "members-scent-grid",
}: MembersScentGridProps = {}) {
  return (
    <nav
      className="members-scent-grid"
      aria-label="Member surfaces"
      data-testid={testId}
    >
      {CARDS.map((card) => (
        <div
          key={card.id}
          className="members-scent-card cat-card"
          data-testid={`members-scent-card-${card.id}`}
        >
          <span className="top">
            <a
              href={card.href}
              className="members-scent-title t"
              aria-label={`${card.title} — ${card.body}`}
            >
              {card.title}
            </a>
            <span className="badge">At {FACTS.opensAt}</span>
          </span>
          <span className="code">
            {card.code}
            {card.kanji && (
              <>
                {" · "}
                <span lang="ja" aria-hidden="true">
                  {card.kanji}
                </span>
              </>
            )}
          </span>
          {/* P2d — plain `.desc` (the `.members-scent-body` hook hid the
              description at 390; the reference keeps it at all widths). */}
          <span className="desc">{card.body}</span>
          <span className="stat-row">
            <span className="dot" aria-hidden="true" />
            {card.facts}
          </span>
        </div>
      ))}
    </nav>
  );
}

/** Exposed for unit tests. */
export const MEMBERS_SCENT_CARDS = CARDS;
