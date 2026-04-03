/**
 * File: route.ts
 * Purpose: Next.js API route for agentic security testing
 * Story: MUSUBI Phase 7.2
 *
 * Index:
 * - POST handler for agentic test requests (line 13)
 * - Input validation (line 23)
 * - Error handling (line 76)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

const MAX_TEXT_SIZE = 10_000;

const VALID_ARCHITECTURES = new Set(['single-agent', 'multi-agent', 'hierarchical', 'debate']);

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'expert']);

const VALID_CATEGORIES = new Set([
  'prompt-injection',
  'jailbreak',
  'data-extraction',
  'hallucination',
  'toxicity',
  'bias',
  'pii-leak',
  'system-prompt-leak',
]);

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

    const { architecture, categories, difficulty, objective, targetModelId } = body as {
      architecture?: string;
      categories?: string[];
      difficulty?: string;
      objective?: string;
      targetModelId?: string;
    };

    // Validate required: architecture
    if (!architecture || typeof architecture !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: architecture (string)' },
        { status: 400 }
      );
    }

    if (!VALID_ARCHITECTURES.has(architecture)) {
      return NextResponse.json(
        { error: `Invalid architecture. Valid: ${[...VALID_ARCHITECTURES].join(', ')}` },
        { status: 400 }
      );
    }

    // Validate required: categories
    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: categories (non-empty array of strings)' },
        { status: 400 }
      );
    }

    for (const cat of categories) {
      if (typeof cat !== 'string' || !VALID_CATEGORIES.has(cat)) {
        return NextResponse.json(
          { error: `Invalid category: ${String(cat).slice(0, 50)}. Valid: ${[...VALID_CATEGORIES].join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate required: difficulty
    if (!difficulty || typeof difficulty !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: difficulty (string)' },
        { status: 400 }
      );
    }

    if (!VALID_DIFFICULTIES.has(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Valid: ${[...VALID_DIFFICULTIES].join(', ')}` },
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

    // Validate required: targetModelId
    if (!targetModelId || typeof targetModelId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: targetModelId (string)' },
        { status: 400 }
      );
    }

    // Stub response — actual agentic test wiring comes in follow-up
    return NextResponse.json({
      success: true,
      message: 'Agentic test endpoint ready',
      data: null,
      params: { architecture, categories, difficulty, objectiveLength: objective.length, targetModelId },
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    console.error('Agentic API error:', error);
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
