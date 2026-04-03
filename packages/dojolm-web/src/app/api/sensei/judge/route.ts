/**
 * File: route.ts
 * Purpose: Next.js API route for Sensei judge evaluation
 * Story: MUSUBI Phase 7.1
 *
 * Index:
 * - POST handler for judge requests (line 13)
 * - Input validation (line 23)
 * - Error handling (line 82)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';

const MAX_TEXT_SIZE = 10_000;

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

    const { attackPayload, modelResponse, category, expectedBehavior, routing } = body as {
      attackPayload?: string;
      modelResponse?: string;
      category?: string;
      expectedBehavior?: string;
      routing?: Record<string, unknown>;
    };

    // Validate required: attackPayload
    if (!attackPayload || typeof attackPayload !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: attackPayload (string)' },
        { status: 400 }
      );
    }

    if (attackPayload.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `attackPayload too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // Validate required: modelResponse
    if (!modelResponse || typeof modelResponse !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: modelResponse (string)' },
        { status: 400 }
      );
    }

    if (modelResponse.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `modelResponse too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // Validate required: category
    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: category (string)' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: `Invalid category. Valid: ${[...VALID_CATEGORIES].join(', ')}` },
        { status: 400 }
      );
    }

    // Validate optional: expectedBehavior
    if (expectedBehavior !== undefined) {
      if (typeof expectedBehavior !== 'string') {
        return NextResponse.json(
          { error: 'Invalid field: expectedBehavior must be a string' },
          { status: 400 }
        );
      }
      if (expectedBehavior.length > MAX_TEXT_SIZE) {
        return NextResponse.json(
          { error: `expectedBehavior too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
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
      const executeJudge = senseiMod.executeJudge;

      const provider = new SenseiProvider();
      const result = await executeJudge(provider, {
        attackPayload: attackPayload!,
        modelResponse: modelResponse!,
        category: category!,
        expectedBehavior: expectedBehavior ?? null,
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
      console.error('Sensei judge service error:', serviceErr);
      return NextResponse.json(
        {
          success: true,
          message: 'Sensei service unavailable — provider not connected',
          data: null,
          params: {
            category,
            attackPayloadLength: attackPayload.length,
            modelResponseLength: modelResponse.length,
            hasExpectedBehavior: expectedBehavior !== undefined,
          },
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Sensei judge API error:', error);
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
