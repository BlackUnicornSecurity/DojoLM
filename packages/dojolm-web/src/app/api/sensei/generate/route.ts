/**
 * File: route.ts
 * Purpose: Next.js API route for Sensei attack generation
 * Story: MUSUBI Phase 7.1
 *
 * Index:
 * - POST handler for attack generation requests (line 14)
 * - Input validation (line 24)
 * - Routing config validation (line 58)
 * - Error handling (line 80)
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

    const { category, count, severity, context, temperature, maxTokens, routing } = body as {
      category?: string;
      count?: number;
      severity?: string;
      context?: string;
      temperature?: number;
      maxTokens?: number;
      routing?: Record<string, unknown>;
    };

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

    // Validate required: count
    if (count === undefined || typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 100) {
      return NextResponse.json(
        { error: 'Missing or invalid field: count (integer 1-100)' },
        { status: 400 }
      );
    }

    // Validate optional: severity
    if (severity !== undefined && typeof severity !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: severity must be a string' },
        { status: 400 }
      );
    }

    // Validate optional: context (text size limit)
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

    // Validate optional: temperature
    if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
      return NextResponse.json(
        { error: 'Invalid field: temperature must be a number between 0 and 2' },
        { status: 400 }
      );
    }

    // Validate optional: maxTokens
    if (maxTokens !== undefined && (typeof maxTokens !== 'number' || !Number.isInteger(maxTokens) || maxTokens < 1)) {
      return NextResponse.json(
        { error: 'Invalid field: maxTokens must be a positive integer' },
        { status: 400 }
      );
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
      // Dynamic imports: bu-tpi may not be built — try/catch handles gracefully
      const llmMod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'bu-tpi/llm' as string);
      const senseiMod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'bu-tpi/sensei' as string);
      const SenseiProvider = llmMod.SenseiProvider;
      const executeGenerate = senseiMod.executeGenerate;

      const provider = new SenseiProvider();
      const result = await executeGenerate(provider, {
        category: category!,
        count: count ?? 5,
        severity: (severity as 'INFO' | 'WARNING' | 'CRITICAL') ?? null,
        context: context ?? null,
        temperature: temperature ?? 0.8,
        maxTokens: maxTokens ?? 2048,
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
      console.error('Sensei generate service error:', serviceErr);
      return NextResponse.json(
        {
          success: true,
          message: 'Sensei service unavailable — provider not connected',
          data: null,
          params: { category, count, severity, temperature, maxTokens },
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Sensei generate API error:', error);
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
