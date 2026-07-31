// SPDX-License-Identifier: Apache-2.0
// @webhook -- /api/sensei/* server-side / SDK integration surface (orphan-apis.md Group D).
/**
 * File: route.ts
 * Purpose: Next.js API route for Sensei attack mutation
 * Story: MUSUBI Phase 7.1; refusal-aware advisor exposure — ADR-0106
 *
 * Advisor selection (opt-in, back-compatible):
 * - Omit `advisor` (or send `"generic"`) → the generic advisor. Unchanged,
 *   byte-compatible request/response for existing callers.
 * - Send `advisor: "refusal-aware"` WITH `targetResponse` (the target model's
 *   actual response) → the refusal-aware advisor. Its `refusalSignal`
 *   classification rides back under `data.refusalSignal`.
 *
 * Index:
 * - POST handler for mutation requests
 * - Input validation (content, category, routing, advisor/targetResponse)
 * - Error handling / graceful degradation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { resolveSenseiBrainConnection } from '@/lib/sensei/resolve-sensei-model';

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

/** Advisor opt-in. Omitted → generic (default). See ADR-0106. */
const VALID_ADVISORS = new Set(['generic', 'refusal-aware']);

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

    const { content, category, routing, advisor, targetResponse } = body as {
      content?: string;
      category?: string;
      routing?: Record<string, unknown>;
      advisor?: string;
      targetResponse?: string;
    };

    // Validate required: content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: content (string)' },
        { status: 400 }
      );
    }

    if (content.length > MAX_TEXT_SIZE) {
      return NextResponse.json(
        { error: `content too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: content cannot be empty or whitespace only' },
        { status: 400 }
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

    // Validate optional: advisor selector (opt-in; omitted → generic default).
    if (advisor !== undefined && (typeof advisor !== 'string' || !VALID_ADVISORS.has(advisor))) {
      return NextResponse.json(
        { error: `Invalid advisor. Valid: ${[...VALID_ADVISORS].join(', ')}` },
        { status: 400 }
      );
    }

    // The refusal-aware advisor requires the target model's actual response to
    // condition on. Enforce it only on that opt-in path so the generic default
    // stays byte-compatible.
    if (advisor === 'refusal-aware') {
      if (!targetResponse || typeof targetResponse !== 'string' || targetResponse.trim().length === 0) {
        return NextResponse.json(
          { error: 'Missing required field for refusal-aware advisor: targetResponse (non-empty string)' },
          { status: 400 }
        );
      }
      if (targetResponse.length > MAX_TEXT_SIZE) {
        return NextResponse.json(
          { error: `targetResponse too large: maximum ${MAX_TEXT_SIZE} characters allowed` },
          { status: 413 }
        );
      }
    }

    // Call bu-tpi Sensei service layer with graceful degradation
    try {
      const llmMod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'bu-tpi/llm' as string);
      const senseiMod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'bu-tpi/sensei' as string);
      const SenseiProvider = llmMod.SenseiProvider;
      const executeMutate = senseiMod.executeMutate;

      // Authenticate to the pinned Sensei brain (see generate route).
      const brain = await resolveSenseiBrainConnection();

      const provider = new SenseiProvider();
      const result = await executeMutate(provider, {
        content: content!,
        category: category!,
        routing: {
          mode: 'sensei',
          baseUrl: brain.baseUrl,
          modelName: routing?.modelName as string,
          apiKey: brain.apiKey,
          requestTimeout: brain.requestTimeout,
        },
        // Forward the advisor opt-in only when set, so an existing generic
        // caller produces an identical request object (back-compat).
        ...(advisor ? { advisor } : {}),
        ...(advisor === 'refusal-aware' ? { targetResponse } : {}),
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
      console.error('Sensei mutate service error:', serviceErr);
      return NextResponse.json(
        {
          success: true,
          message: 'Sensei service unavailable — provider not connected',
          data: null,
          params: { category, contentLength: content.length },
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Sensei mutate API error:', error);
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
