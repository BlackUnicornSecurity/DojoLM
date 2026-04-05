/**
 * File: api/arena/route.ts
 * Purpose: Arena match list + create endpoints
 * Story: 14.5 — Arena API Routes
 *
 * POST /api/arena — Create and start async match execution
 * GET /api/arena — List matches with filters
 */

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoArenaGet, demoArenaPost } from '@/lib/demo/mock-api-handlers';
import { createApiHandler } from '@/lib/api-handler';
import { scheduleArenaMatchStart } from '@/lib/arena-runner';
import * as arenaStorage from '@/lib/storage/arena-storage';
import type { ArenaMatch, GameMode, AttackMode, MatchConfig } from '@/lib/arena-types';
import { GAME_MODE_CONFIGS, DEFAULT_MATCH_CONFIG } from '@/lib/arena-types';

const VALID_GAME_MODES: GameMode[] = ['CTF', 'KOTH', 'RvB'];
const VALID_ATTACK_MODES: AttackMode[] = ['kunai', 'shuriken', 'naginata', 'musashi'];
const SAFE_MODEL_ID = /^[\w.-]{1,128}$/;

// ===========================================================================
// POST /api/arena — Create + start match
// ===========================================================================

export const POST = createApiHandler(
  async (request: NextRequest) => {
    if (isDemoMode()) return demoArenaPost();
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }

    const { gameMode, attackMode, fighters, maxRounds, victoryPoints, temperature, maxTokens } = body as {
      gameMode?: string;
      attackMode?: string;
      fighters?: unknown[];
      maxRounds?: number;
      victoryPoints?: number;
      temperature?: number;
      maxTokens?: number;
    };

    // Validate required fields
    if (!gameMode || !VALID_GAME_MODES.includes(gameMode as GameMode)) {
      return NextResponse.json({ error: `Invalid gameMode. Must be one of: ${VALID_GAME_MODES.join(', ')}` }, { status: 400 });
    }

    if (!attackMode || !VALID_ATTACK_MODES.includes(attackMode as AttackMode)) {
      return NextResponse.json({ error: `Invalid attackMode. Must be one of: ${VALID_ATTACK_MODES.join(', ')}` }, { status: 400 });
    }

    if (!Array.isArray(fighters) || fighters.length < 2) {
      return NextResponse.json({ error: 'fighters must be an array with at least 2 entries' }, { status: 400 });
    }

    // Validate fighters
    for (const f of fighters) {
      if (!f || typeof f !== 'object') {
        return NextResponse.json({ error: 'Each fighter must be an object' }, { status: 400 });
      }
      const fighter = f as Record<string, unknown>;
      if (!fighter.modelId || typeof fighter.modelId !== 'string') {
        return NextResponse.json({ error: 'Each fighter must have a modelId string' }, { status: 400 });
      }
      if (!SAFE_MODEL_ID.test(fighter.modelId as string)) {
        return NextResponse.json({ error: 'Fighter modelId must be 1-128 alphanumeric/dash/underscore/dot characters' }, { status: 400 });
      }
    }

    const gameModeConfig = GAME_MODE_CONFIGS[gameMode as GameMode];
    const config: MatchConfig = {
      gameMode: gameMode as GameMode,
      attackMode: attackMode as AttackMode,
      maxRounds: typeof maxRounds === 'number' ? Math.min(Math.max(maxRounds, 1), 100) : gameModeConfig.defaultRounds,
      victoryPoints: typeof victoryPoints === 'number' ? Math.min(Math.max(victoryPoints, 10), 1000) : gameModeConfig.defaultVictoryPoints,
      roundTimeoutMs: DEFAULT_MATCH_CONFIG.roundTimeoutMs,
      roleSwitchInterval: DEFAULT_MATCH_CONFIG.roleSwitchInterval,
      temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 2) : undefined,
      maxTokens: typeof maxTokens === 'number' ? Math.min(Math.max(maxTokens, 1), 8192) : undefined,
    };

    const matchId = crypto.randomUUID();
    const now = new Date().toISOString();

    const match: ArenaMatch = {
      id: matchId,
      config,
      fighters: (fighters as Array<Record<string, unknown>>).map((f, i) => ({
        modelId: String(f.modelId),
        modelName: String(f.modelName ?? f.modelId),
        provider: String(f.provider ?? 'unknown'),
        initialRole: i === 0 ? 'attacker' as const : 'defender' as const,
        temperature: typeof f.temperature === 'number' ? f.temperature : undefined,
        maxTokens: typeof f.maxTokens === 'number' ? f.maxTokens : undefined,
      })),
      status: 'pending',
      rounds: [],
      scores: {},
      winnerId: null,
      winReason: null,
      events: [],
      createdAt: now,
      startedAt: null,
      completedAt: null,
      totalDurationMs: 0,
      metadata: {},
    };

    // Initialize scores
    for (const f of match.fighters) {
      match.scores[f.modelId] = 0;
    }

    await arenaStorage.createMatch(match);
    scheduleArenaMatchStart(matchId);

    return NextResponse.json({ matchId, status: 'pending' }, { status: 201 });
  },
  { rateLimit: 'execute' }
);

// ===========================================================================
// GET /api/arena — List matches
// ===========================================================================

export const GET = createApiHandler(
  async (request: NextRequest) => {
    if (isDemoMode()) return demoArenaGet();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? undefined;
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '25', 10) || 25, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);

    const validStatuses = ['pending', 'running', 'completed', 'aborted'];
    const query: arenaStorage.MatchQuery = {
      status: status && validStatuses.includes(status) ? status as ArenaMatch['status'] : undefined,
      limit,
      offset,
    };

    const result = await arenaStorage.listMatches(query);

    return NextResponse.json(result);
  },
  { rateLimit: 'read' }
);
