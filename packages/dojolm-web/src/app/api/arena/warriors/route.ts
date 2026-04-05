/**
 * File: api/arena/warriors/route.ts
 * Purpose: Warrior cards leaderboard API
 * Story: 18.1 — Warrior Cards API
 *
 * GET /api/arena/warriors — List warriors sorted by win rate
 * PATCH /api/arena/warriors — Update warrior stats after match
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoArenaWarriorsGet } from '@/lib/demo/mock-api-handlers';
import { createApiHandler } from '@/lib/api-handler';
import * as arenaStorage from '@/lib/storage/arena-storage';
import type { GameMode } from '@/lib/arena-types';

const VALID_GAME_MODES: GameMode[] = ['CTF', 'KOTH', 'RvB'];
const SAFE_MODEL_ID = /^[\w.-]{1,128}$/;
const MAX_NAME_LENGTH = 256;
const SAFE_NAME = /^[^<>&"']+$/;

// ===========================================================================
// GET /api/arena/warriors — List warriors
// ===========================================================================

export const GET = createApiHandler(
  async () => {
    if (isDemoMode()) return demoArenaWarriorsGet();
    const warriors = await arenaStorage.getWarriors();

    return NextResponse.json({
      warriors,
      total: warriors.length,
    });
  },
  { rateLimit: 'read' },
);

// ===========================================================================
// PATCH /api/arena/warriors — Update warrior after match
// ===========================================================================

export const PATCH = createApiHandler(
  async (request: NextRequest) => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { modelId, modelName, provider, won, drew, score, gameMode } = body;

    // Validate modelId
    if (typeof modelId !== 'string' || !SAFE_MODEL_ID.test(modelId)) {
      return NextResponse.json(
        { error: 'Invalid modelId: must match /^[\\w-]{1,128}$/' },
        { status: 400 },
      );
    }

    // Validate modelName (reject HTML-sensitive characters for stored XSS prevention)
    if (typeof modelName !== 'string' || modelName.length === 0 || modelName.length > MAX_NAME_LENGTH || !SAFE_NAME.test(modelName)) {
      return NextResponse.json(
        { error: `Invalid modelName: must be 1-${MAX_NAME_LENGTH} characters, no <>&"' characters` },
        { status: 400 },
      );
    }

    // Validate provider
    if (typeof provider !== 'string' || provider.length === 0 || provider.length > MAX_NAME_LENGTH || !SAFE_NAME.test(provider)) {
      return NextResponse.json(
        { error: `Invalid provider: must be 1-${MAX_NAME_LENGTH} characters, no <>&"' characters` },
        { status: 400 },
      );
    }

    // Validate won/drew (booleans, mutually exclusive)
    if (typeof won !== 'boolean' || typeof drew !== 'boolean') {
      return NextResponse.json(
        { error: 'won and drew must be booleans' },
        { status: 400 },
      );
    }

    if (won && drew) {
      return NextResponse.json(
        { error: 'won and drew cannot both be true' },
        { status: 400 },
      );
    }

    // Validate score
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
      return NextResponse.json(
        { error: 'score must be a non-negative finite number' },
        { status: 400 },
      );
    }

    // Validate gameMode
    if (typeof gameMode !== 'string' || !VALID_GAME_MODES.includes(gameMode as GameMode)) {
      return NextResponse.json(
        { error: `Invalid gameMode: must be one of ${VALID_GAME_MODES.join(', ')}` },
        { status: 400 },
      );
    }

    const warrior = await arenaStorage.updateWarriorAfterMatch(
      modelId,
      modelName,
      provider,
      won,
      drew,
      score,
      gameMode as GameMode,
    );

    return NextResponse.json({ warrior });
  },
  { rateLimit: 'write' },
);
