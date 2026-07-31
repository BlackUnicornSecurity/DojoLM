// SPDX-License-Identifier: Apache-2.0
/**
 * File: api/arena/leaderboard/route.ts
 * Purpose: GET /api/arena/leaderboard — aggregate leaderboard + global stats
 *          over stored warriors and matches.
 * Story: Wave 1 / ADR-0012.
 *
 * Response shape is consumed by MatchStatsWidget and ArenaRoster.
 * Pagination via `limit` / `offset`, optional filter on `gameMode` and
 * `minMatches`. Read-tier rate limit; authenticated via createApiHandler.
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import * as arenaStorage from "@/lib/storage/arena-storage";
import {
  buildLeaderboard,
  computeGlobalStats,
  MAX_MATCH_SCAN,
} from "@/lib/arena-aggregates";
import type { GameMode } from "@/lib/arena-types";
import { isDemoMode } from "@/lib/demo";
import { demoArenaLeaderboardGet } from "@/lib/demo/mock-api-handlers";

const VALID_GAME_MODES: ReadonlySet<GameMode> = new Set(["CTF", "KOTH", "RvB"]);
const MAX_LIMIT = 100;

function parseLimit(raw: string | null, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function parseOffset(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function parseMinMatches(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function parseGameMode(raw: string | null): GameMode | null {
  if (!raw) return null;
  const upper = raw.toUpperCase() as GameMode;
  return VALID_GAME_MODES.has(upper) ? upper : null;
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"), 50);
    const offset = parseOffset(searchParams.get("offset"));
    const minMatches = parseMinMatches(searchParams.get("minMatches"));
    const gameMode = parseGameMode(searchParams.get("gameMode"));

    if (isDemoMode()) {
      return demoArenaLeaderboardGet({ gameMode, minMatches, limit, offset });
    }

    const [warriors, matchPage] = await Promise.all([
      arenaStorage.getWarriors(),
      arenaStorage.listMatches({ limit: MAX_MATCH_SCAN }),
    ]);

    const { entries, total } = buildLeaderboard(warriors, matchPage.matches, {
      gameMode,
      minMatches,
      limit,
      offset,
    });
    const globalStats = computeGlobalStats(matchPage.matches);

    return NextResponse.json({
      leaderboard: entries,
      globalStats,
      total,
      limit,
      offset,
      gameMode,
    });
  },
  { rateLimit: "read" },
);
