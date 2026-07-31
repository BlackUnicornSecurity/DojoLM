// SPDX-License-Identifier: Apache-2.0
/**
 * File: src/lib/demo/demo-facts.ts
 * Purpose: D-07 shared fact sets — the copy contracts that keep sibling
 *          surfaces from ever disagreeing about pre-launch numbers.
 *
 * SKIN-SPEC §8 (v2 skin corpus, 2026-07-07) defines two contracts:
 *
 * 1. Members pre-launch fact set — one shared string set across Members
 *    Home · Leaderboard · Seasons · Bounty · Bypass matrix · Stadium
 *    admin (Kokugikan) · Research intake (Ronin). Any future members
 *    surface sources these facts from this module; sibling pages can
 *    never disagree.
 *
 * (The §8 payloads-registry numbers are deliberately NOT mirrored here:
 * real armory counts are governed by the stats fixture-count gate
 * (da709d3691) and no production surface quotes the corpus numbers —
 * add the export back only WITH its consumer.)
 *
 * Unsourced metrics render "—" (never invented values).
 */

/** Members pre-launch fact set (copy contract, D-07). */
export const MEMBER_PRELAUNCH_FACTS = Object.freeze({
  /** Season status chip, verbatim. */
  seasonChip: "Season 1 · opens at launch",
  seasonName: "Season 1",
  seasonStatus: "upcoming",
  opensAt: "launch",
  verifiedBypasses: 0,
  rankedHunters: 0,
  payoutsMade: 0,
  /** Payout amounts read "—" until the Season 1 rules publish. */
  payoutAmount: "—",
  // P2d D9 — corpus wave-c stat-row copy, verbatim (no "on the board" clause).
  modelsNote: "models publish at launch",
});
