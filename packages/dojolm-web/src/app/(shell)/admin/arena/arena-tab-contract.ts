// SPDX-License-Identifier: Apache-2.0

export type ArenaOuterTab =
  | "leaderboard"
  | "matches"
  | "wizard"
  | "roster"
  | "live";

export const ARENA_OUTER_TAB_LABEL: Readonly<Record<ArenaOuterTab, string>> =
  Object.freeze({
    leaderboard: "Leaderboard",
    matches: "Matches",
    wizard: "Match wizard",
    roster: "Warrior roster",
    live: "Live + Replay",
  });

export const ARENA_OUTER_TAB_ORDER = Object.freeze([
  "leaderboard",
  "matches",
  "wizard",
  "roster",
  "live",
] satisfies readonly ArenaOuterTab[]);

export function isArenaOuterTab(value: unknown): value is ArenaOuterTab {
  return (
    typeof value === "string" &&
    ARENA_OUTER_TAB_ORDER.some((candidate) => candidate === value)
  );
}

export function resolveArenaOuterTab(
  value: string | readonly string[] | undefined,
): ArenaOuterTab {
  const requested = Array.isArray(value) ? value[0] : value;
  return isArenaOuterTab(requested) ? requested : "leaderboard";
}
