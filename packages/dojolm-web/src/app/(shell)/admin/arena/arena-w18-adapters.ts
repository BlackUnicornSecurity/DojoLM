// SPDX-License-Identifier: Apache-2.0
/**
 * arena-w18-adapters.ts — TICKET-W18-ARENA-WIRING.
 *
 * Pure adapter helpers shared between ArenaClient.tsx and the W18
 * integration tests. Extracting these out of the client component lets
 * the wiring contract be unit-tested without dragging in the full
 * @/design barrel (which currently has a separate JSDOM/import-chain
 * timing bug that makes ArenaClient itself hard to render in vitest).
 *
 * Discriminant-redaction (R-T1):
 *   - GAME_MODE_TO_ARENA_MODE: closed GameMode → ArenaMode (excluding
 *     'all'). Compiler proves every GameMode is mapped.
 */

import type { ArenaMode } from '@/design/arena';

export type GameMode = 'CTF' | 'KOTH' | 'RvB';

// Minimal LeaderEntry shape — matches the sanitised entries surfaced
// by ArenaClient's `sanitizeEntry()` reducer.
export interface LeaderEntryLite {
  readonly modelId: string;
  readonly modelName: string;
  readonly provider: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly avgScore: number;
  readonly bestScore: number;
  readonly favoriteGameMode: GameMode | null;
  readonly lastMatchAt: string | null;
}

// R-T1: frozen at module load so the closed GameMode → ArenaMode map
// cannot be mutated at runtime by downstream callers.
export const GAME_MODE_TO_ARENA_MODE: Readonly<Record<GameMode, Exclude<ArenaMode, 'all'>>> = Object.freeze({
  CTF: 'ctf',
  KOTH: 'koth',
  RvB: 'rvb',
});

/**
 * Filter the leaderboard entries by the selected ArenaMode. 'all' is
 * pass-through; specific modes drop entries with `favoriteGameMode === null`
 * and entries whose mode does not match.
 */
export function filterEntriesByMode<T extends LeaderEntryLite>(
  entries: readonly T[],
  mode: ArenaMode,
): readonly T[] {
  if (mode === 'all') return entries;
  return entries.filter((entry) => {
    if (entry.favoriteGameMode === null) return false;
    return GAME_MODE_TO_ARENA_MODE[entry.favoriteGameMode] === mode;
  });
}

/**
 * Build the count-per-mode map for the ArenaModeStrip. 'all' is the
 * total count (full corpus); per-mode counts include only entries with
 * a non-null favoriteGameMode that maps to the corresponding mode.
 */
export function buildModeCounts(
  entries: readonly LeaderEntryLite[],
): Record<ArenaMode, number> {
  const counts: Record<ArenaMode, number> = {
    all: entries.length,
    ctf: 0,
    koth: 0,
    rvb: 0,
  };
  for (const entry of entries) {
    if (entry.favoriteGameMode === null) continue;
    const mode = GAME_MODE_TO_ARENA_MODE[entry.favoriteGameMode];
    counts[mode] += 1;
  }
  return counts;
}

