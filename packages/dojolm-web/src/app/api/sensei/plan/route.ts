/**
 * File: route.ts
 * Purpose: Next.js API route for Sensei conversation plan generation
 * Story: MUSUBI Phase 7.1
 *
 * Index:
 * - POST handler for plan requests (line 13)
 * - Input validation (line 23)
 * - Error handling (line 78)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

const MAX_TEXT_SIZE = 10_000;

const VALID_ROUTING_MODES = new Set(['local', 'remote', 'hybrid']);

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

    const { attackType, targetDescription, maxTurns, context, routing } = body as {
      attackType?: string;
      targetDescription?: string;
      maxTurns?: number;
      context?: string;
      routing?: Record<string, unknown>;
    };

    // Validate required: attackType
    if (!attackType || typeof attackType !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: attackType (string)' },
        { status: 400 }
      );
    }

    if (attackType.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `attackType too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // Validate required: targetDescription
    if (!targetDescription || typeof targetDescription !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: targetDescription (string)' },
        { status: 400 }
      );
    }

    if (targetDescription.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `targetDescription too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // Validate required: maxTurns
    if (maxTurns === undefined || typeof maxTurns !== 'number' || !Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 50) {
      return NextResponse.json(
        { error: 'Missing or invalid field: maxTurns (integer 1-50)' },
        { status: 400 }
      );
    }

    // Validate optional: context
    if (context !== undefined) {
      if (typeof context !== 'string') {
        return NextResponse.json(
          { error: 'Invalid field: context must be a string' },
          { status: 400 }
        );
      }
      if (context.length > MAX_TEXT_SIZE) {
        return NextResponse.json(
          { error: `context too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
          { status: 413 }
        );
      }
    }

    // Validate optional: routing
    if (routing !== undefined) {
      if (typeof routing !== 'object' || routing === null || Array.isArray(routing)) {
        return NextResponse.json(
          { error: 'Invalid field: routing must be an object' },
          { status: 400 }
        );
      }
      if (routing.mode && !VALID_ROUTING_MODES.has(routing.mode as string)) {
        return NextResponse.json(
          { error: `Invalid routing.mode. Valid: ${[...VALID_ROUTING_MODES].join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Call bu-tpi Sensei service layer with graceful degradation
    try {
      const llmMod = await import(/* webpackIgnore: true */ 'bu-tpi/llm' as string);
      const senseiMod = await import(/* webpackIgnore: true */ 'bu-tpi/sensei' as string);
      const SenseiProvider = llmMod.SenseiProvider;
      const executePlan = senseiMod.executePlan;

      const provider = new SenseiProvider();
      const result = await executePlan(provider, {
        attackType: attackType!,
        targetDescription: targetDescription!,
        maxTurns: maxTurns ?? 10,
        context: context ?? null,
        routing: {
          mode: 'sensei',
          baseUrl: routing?.baseUrl as string,
          modelName: routing?.modelName as string,
        },
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, meta: result.meta },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { success: true, data: result.data, meta: result.meta },
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    } catch (serviceErr) {
      console.error('Sensei plan service error:', serviceErr);
      return NextResponse.json(
        {
          success: true,
          message: 'Sensei service unavailable — provider not connected',
          data: null,
          params: { attackType, targetDescriptionLength: targetDescription.length, maxTurns },
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Sensei plan API error:', error);
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
