/**
 * File: api/arena/[id]/route.ts
 * Purpose: Single match detail + abort endpoints
 * Story: 14.5 — Arena API Routes
 *
 * GET /api/arena/[id] — Full match detail
 * DELETE /api/arena/[id] — Abort match
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoArenaMatchById } from '@/lib/demo/mock-api-handlers';
import { createApiHandler } from '@/lib/api-handler';
import * as arenaStorage from '@/lib/storage/arena-storage';

const SAFE_ID = /^[\w-]{1,128}$/;

// ===========================================================================
// GET /api/arena/[id]
// ===========================================================================

export const GET = createApiHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    if (isDemoMode()) return demoArenaMatchById(id);

    if (!id || !SAFE_ID.test(id)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const match = await arenaStorage.getMatch(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(match);
  },
  { rateLimit: 'read' }
);

// ===========================================================================
// DELETE /api/arena/[id] — Abort match
// ===========================================================================

export const DELETE = createApiHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    if (!id || !SAFE_ID.test(id)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const match = await arenaStorage.getMatch(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status === 'running' || match.status === 'pending') {
      await arenaStorage.updateMatch(id, {
        status: 'aborted',
        completedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ matchId: id, status: 'aborted' });
  },
  { rateLimit: 'write' }
);
