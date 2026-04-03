/**
 * File: route.ts
 * Purpose: Next.js API route for orchestrator run execution
 * Story: MUSUBI Phase 7.2
 *
 * Index:
 * - POST handler for orchestrator run requests (line 13)
 * - Input validation (line 23)
 * - Error handling (line 80)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

const MAX_TEXT_SIZE = 10_000;

const VALID_RUN_TYPES = new Set(['pair', 'crescendo', 'tap', 'mad-max', 'sensei-adaptive']);

export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const {
      type, targetModelId, attackerModelId, judgeModelId,
      objective, category, maxTurns, maxBranches,
    } = body as {
      type?: string;
      targetModelId?: string;
      attackerModelId?: string;
      judgeModelId?: string;
      objective?: string;
      category?: string;
      maxTurns?: number;
      maxBranches?: number;
    };

    // Validate required: type
    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: type (string)' },
        { status: 400 }
      );
    }

    if (!VALID_RUN_TYPES.has(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid: ${[...VALID_RUN_TYPES].join(', ')}` },
        { status: 400 }
      );
    }

    // Validate required: targetModelId
    if (!targetModelId || typeof targetModelId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: targetModelId (string)' },
        { status: 400 }
      );
    }

    // Validate required: attackerModelId
    if (!attackerModelId || typeof attackerModelId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: attackerModelId (string)' },
        { status: 400 }
      );
    }

    // Validate required: judgeModelId
    if (!judgeModelId || typeof judgeModelId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: judgeModelId (string)' },
        { status: 400 }
      );
    }

    // Validate required: objective
    if (!objective || typeof objective !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: objective (string)' },
        { status: 400 }
      );
    }

    if (objective.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `objective too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // Validate optional: category
    if (category !== undefined && typeof category !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: category must be a string' },
        { status: 400 }
      );
    }

    // Validate optional: maxTurns
    if (maxTurns !== undefined && (typeof maxTurns !== 'number' || !Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 100)) {
      return NextResponse.json(
        { error: 'Invalid field: maxTurns must be an integer between 1 and 100' },
        { status: 400 }
      );
    }

    // Validate optional: maxBranches
    if (maxBranches !== undefined && (typeof maxBranches !== 'number' || !Number.isInteger(maxBranches) || maxBranches < 1 || maxBranches > 50)) {
      return NextResponse.json(
        { error: 'Invalid field: maxBranches must be an integer between 1 and 50' },
        { status: 400 }
      );
    }

    // Stub response — actual orchestrator wiring comes in follow-up
    return NextResponse.json({
      success: true,
      message: 'Orchestrator run endpoint ready',
      data: null,
      params: { type, targetModelId, attackerModelId, judgeModelId, objectiveLength: objective.length, category, maxTurns, maxBranches },
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('Orchestrator run API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, { resource: 'executions', action: 'execute' });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Allow': 'POST, OPTIONS', 'Content-Type': 'application/json' },
  });
}
