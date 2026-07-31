// SPDX-License-Identifier: Apache-2.0
// @webhook -- /api/sensei/* server-side / SDK integration surface
//             (orphan-apis.md Group D). UI uses /api/sensei/chat.
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
import { resolveSenseiBrainConnection } from '@/lib/sensei/resolve-sensei-model';
import { MAX_REQUEST_TIMEOUT_MS } from '@/lib/llm-constants';
import { planFailureHttp } from './plan-failure';

const MAX_TEXT_SIZE = 10_000;

const VALID_ROUTING_MODES = new Set(['local', 'remote', 'hybrid']);

/**
 * Per-request timeout (ms) for /plan — L-P2 (R7 PR-5). Multi-turn plan
 * generation is the slowest Sensei batch route: scored plans (011/012/014)
 * measured 120–270s, while control 013 timed out at the brain's 300s global
 * ceiling (`http=502 / 300.0s / tokensUsed:0`) across R6→R7b→R7c, dragging the
 * multi-turn score to an infra zero regardless of the L-P1 clause.
 *
 * /plan is therefore granted the provider MAXIMUM timeout — the ceiling value
 * (600_000) the model-config validator (`llm-providers.ts`) and
 * `fetchWithTimeout` also enforce — so 013 can complete. It is derived from the
 * shared `MAX_REQUEST_TIMEOUT_MS` constant rather than a fourth literal, so
 * route.ts tracks that ceiling if it moves. (The validator and fetch-utils each
 * keep their own declaration of the same value today — a repo-wide
 * de-duplication tracked separately, out of scope for L-P2.) The other batch
 * routes (generate/mutate/judge) keep the brain's own `requestTimeout` and are
 * deliberately untouched (the L-P2 watch: "must not relax any other route's
 * timeout or change retry semantics").
 *
 * Tradeoff (DoS): a 600s hold doubles the per-request window vs the prior 300s
 * ceiling on an auth-gated, serial-brain route. Per-host concurrency limiting
 * and client-disconnect (AbortController) propagation belong at the
 * provider/infra layer — shared by all routes — and are intentionally out of
 * scope for this route-scoped timeout fix.
 */
const PLAN_REQUEST_TIMEOUT_MS = MAX_REQUEST_TIMEOUT_MS;

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
      const llmMod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'bu-tpi/llm' as string);
      const senseiMod = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'bu-tpi/sensei' as string);
      const SenseiProvider = llmMod.SenseiProvider;
      const executePlan = senseiMod.executePlan;

      // Authenticate to the pinned Sensei brain (see generate route).
      const brain = await resolveSenseiBrainConnection();

      // L-P2: /plan is the slowest route — grant it the provider max timeout so
      // control 013 (timed out at the brain's 300s global ceiling) can complete.
      // Other batch routes keep the brain's own timeout (untouched).
      const provider = new SenseiProvider();
      const result = await executePlan(provider, {
        attackType: attackType!,
        targetDescription: targetDescription!,
        maxTurns: maxTurns ?? 10,
        context: context ?? null,
        routing: {
          mode: 'sensei',
          baseUrl: brain.baseUrl,
          modelName: routing?.modelName as string,
          apiKey: brain.apiKey,
          requestTimeout: PLAN_REQUEST_TIMEOUT_MS,
        },
      });

      if (!result.success) {
        // A held red line (model refusal) is not an upstream failure —
        // planFailureHttp maps it to 422 with the typed refusal payload so
        // callers can score a correct refusal as a refusal. Genuine
        // upstream/parse failures stay 502.
        const failure = planFailureHttp(result);
        return NextResponse.json(failure.body, { status: failure.status });
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
