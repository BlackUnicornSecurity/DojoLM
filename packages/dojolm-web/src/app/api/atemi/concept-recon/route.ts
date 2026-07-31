// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/atemi/concept-recon — TICKET-T-509 (T7-5 backend graduation).
 *
 * Surface
 * --------
 *   POST { inputText, modelId, mode? }
 *   Response 200:
 *     {
 *       runId,
 *       status: 'complete' | 'error',
 *       modelId,
 *       mode,
 *       startedAt,
 *       finishedAt,
 *       durationMs,
 *       steps: ConceptReconStepResult[],
 *       summary: string,
 *       decomposedConcepts: string[],
 *       stub: true,
 *     }
 *
 * Stub status — READ FIRST
 * -------------------------
 *   The actual prompt-decomposition pipeline (multi-pass NLP analysis,
 *   concept-graph extraction, recon-target enumeration) is NOT
 *   implemented in this PR. T-509 is the first slice that gives the
 *   operator a UI surface to dispatch a concept-recon analysis and
 *   read back per-step results.
 *
 *   This route deliberately ships as a SYNCHRONOUS, IN-PROCESS STUB.
 *   The closed-enum vocabulary, pipeline definition, and synthesizer
 *   helpers all live in `./concept-recon-engine.stub.ts` (extracted
 *   per pass-1 review MED Code-2 to keep this file ≤300 lines). The
 *   real engine (TICKET-T-509-ENGINE) replaces the helper bodies in
 *   that sibling file without re-mounting this route.
 *
 * Gate-chain ordering (operator-deferred)
 * ---------------------------------------
 *   The current chain is `flag → kill-switch → identity → guard-mode`,
 *   matching the T-508 baseline. Pass-1 review (Sec Finding 1) flagged
 *   that flag/kill-switch evaluating before identity means
 *   GUARD_MODE_BLOCK is the only audit row guaranteed to carry an
 *   operator id; flag/kill-switch denials are emitted with no operator
 *   attribution. This is operator-deferred to a future hardening pass
 *   that touches T-508 + T-509 simultaneously to keep the two routes
 *   in lock-step.
 *
 * Auth + R-T1
 * -----------
 *   - `withAuth({ role: 'admin' })` — same gate as /api/atemi/playbook/run.
 *   - `mode` is a closed enum {`fast`,`thorough`} — `fast` skips the
 *     graph-walk steps; `thorough` runs all 5 steps. Audit-log
 *     `scanType` differs so SecOps can grep modes separately.
 *   - Response carries no payload text echo, no seed strings, no live
 *     target output. Decomposed concepts are derived from input length
 *     hash buckets — no input echo.
 *   - Audit log entry: one `scanExecuted` per request with operator id
 *     + `scanType='atemi.concept-recon.fast'|'atemi.concept-recon.thorough'`
 *     + `findings=steps.length` + `inputLength` (length-only, never
 *     the raw `inputText`).
 *
 * Closed enums (re-exported from sibling for forward compat)
 * ----------------------------------------------------------
 *   - `RunMode`        : 'fast' | 'thorough'.
 *   - `RunStatus`      : 'complete' | 'error'.
 *   - `StepStatus`     : 'ok' | 'warning' | 'skipped'.
 *   - `StepSkipReason` : 'model-not-in-corpus' | 'mode-fast-skipped'.
 *
 * Body caps
 * ---------
 *   - inputText : INPUT_TEXT_MAX = 4000 chars
 *   - modelId   : MODEL_ID_MAX = 64
 *   - mode (opt): closed-enum
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { withAuth } from '@/lib/auth/route-guard';
import { killSwitchRegistry } from 'bu-tpi/flags';
import { enforceGuardMode } from '@/lib/guard-mode';
import { auditLog } from '@/lib/audit-logger';
import { isAtemiEnabled } from '@/lib/atemi/registry';
import {
  RUN_MODES,
  buildStepResults,
  buildSummary,
  deriveDecomposedConcepts,
  type ConceptReconResponse,
  type RunMode,
} from './concept-recon-engine.stub';

// NOTE: closed-enum vocabulary + types previously re-exported from
// this file have been removed because Next.js 16 route validator only
// permits the canonical Route export fields (HTTP verbs, dynamic,
// runtime, etc.). Consumers that need RUN_MODES / RunMode / etc. must
// import directly from `./concept-recon-engine.stub`.

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const INPUT_TEXT_MAX = 4_000;
const MODEL_ID_MAX = 64;
const SAFE_ID = /^[A-Za-z0-9._-]+$/;

const bodySchema = z
  .object({
    inputText: z.string().min(1).max(INPUT_TEXT_MAX),
    modelId: z.string().min(1).max(MODEL_ID_MAX).regex(SAFE_ID),
    mode: z.enum(RUN_MODES).optional(),
  })
  .strict();

function notEnabled(): NextResponse {
  return NextResponse.json(
    { error: 'ATEMI feature flag disabled' },
    { status: 404, headers: RESPONSE_HEADERS },
  );
}

function killSwitchRefusal(): NextResponse {
  return NextResponse.json(
    {
      error: 'KILL_ATEMI kill-switch is active — concept-recon refused',
      code: 'ATEMI.KILLSWITCH.ACTIVE',
    },
    { status: 403, headers: RESPONSE_HEADERS },
  );
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    if (!isAtemiEnabled()) return notEnabled();
    if (killSwitchRegistry.isActive('KILL_ATEMI')) return killSwitchRefusal();

    const operatorId = user?.id;
    if (!operatorId) {
      return NextResponse.json(
        { error: 'session identity missing' },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    // Identity-before-guard ordering (T-508 precedent): the
    // GUARD_MODE_BLOCK audit row always carries a verified operator id.
    const guardBlock = await enforceGuardMode('inbound', request, {
      operatorId,
    });
    if (guardBlock !== null) return guardBlock;

    let parsed: z.infer<typeof bodySchema>;
    try {
      const text = await request.text();
      const raw = text.length === 0 ? {} : JSON.parse(text);
      parsed = bodySchema.parse(raw);
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
          : 'Invalid request body';
      return NextResponse.json(
        { error: message },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const mode: RunMode = parsed.mode ?? 'thorough';
    const startedAt = new Date();
    const inputLength = parsed.inputText.length;
    const steps = buildStepResults(inputLength, parsed.modelId, mode);
    const decomposedConcepts = deriveDecomposedConcepts(inputLength, mode);
    const summary = buildSummary(inputLength, decomposedConcepts.length, mode);
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const runId = `crun-${randomUUID()}`;

    const response: ConceptReconResponse = {
      runId,
      status: 'complete',
      modelId: parsed.modelId,
      mode,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      steps,
      summary,
      decomposedConcepts,
      stub: true,
    };

    try {
      // Pass-1 review MED Sec-3: audit emission carries `inputLength`
      // (length-only, never the raw `inputText`) so SecOps can grep
      // unusually-short or oversize submissions without R-T1 leakage.
      await auditLog.scanExecuted({
        endpoint: '/api/atemi/concept-recon',
        user: operatorId,
        scanType: mode === 'thorough'
          ? 'atemi.concept-recon.thorough'
          : 'atemi.concept-recon.fast',
        findings: steps.length,
        durationMs,
        inputLength,
      });
    } catch (err) {
      // Audit-log failure must not poison response — log + continue.
      console.error('[atemi/concept-recon] audit log failed', err);
    }

    return NextResponse.json(response, {
      status: 200,
      headers: RESPONSE_HEADERS,
    });
  },
  { role: 'admin' },
);

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  });
}
