# Battle Arena

Battle Arena is the current adversarial match module.

## Current Views

- `Browser`
- `Matches`
- `Leaderboard`
- `Rules`

## Browser

Use `Browser` to:

- browse recent matches
- filter by game mode
- inspect match details
- open live or exported match flows

## Matches

This view hosts the roster-style library of warriors and match
participants. Hydrated from the aggregate endpoint
`GET /api/arena/leaderboard`, which derives per-model records, current
streak, and achievements from stored matches + warriors.

Current note:

- rendered with a `Partial` badge: defense-rating and favourite-attack
  columns are deferred to Wave 2 because the signals are not persisted
  per round today.

## Leaderboard

Use `Leaderboard` for rankings, attack summaries, and related match
statistics. Powered by the same `/api/arena/leaderboard` endpoint; the
widget adds the global rollup (completed matches, total rounds,
injection rate, avg duration, top attack types, top fixtures).

Current note:

- rendered with a `Partial` badge: the four achievements that ship
  (`first-blood`, `unbreakable`, `veteran`, `century`) derive from the
  stored record. Richer signals (speedster, perfect-defense,
  arsenal-master) arrive when match events are persisted.

## Rules

Use `Rules` to review game-mode and arena-rule references.

## Related Docs

- [Atemi Lab](ATEMI_LAB.md)
- [Common Workflows](../COMMON_WORKFLOWS.md)
- [The Kumite](THE_KUMITE.md)
