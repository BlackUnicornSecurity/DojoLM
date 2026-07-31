// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/atemi/playbook/run — TICKET-T-508 (T7-4 backend graduation).
 *
 * Surface
 * --------
 *   POST { playbookId, modelId, mode? }
 *   Response 200:
 *     {
 *       runId,
 *       status: 'complete' | 'error',
 *       playbookId,
 *       modelId,
 *       mode,
 *       startedAt,
 *       finishedAt,
 *       durationMs,
 *       results: PlaybookStepResult[]
 *     }
 *
 * Stub status — READ FIRST
 * -------------------------
 *   The actual playbook execution engine (multi-step adversarial probe
 *   sequence against a live target model with budget + driver wiring) is
 *   NOT implemented in this PR. T-508 is the first slice that gives the
 *   operator a UI surface to dispatch a playbook and read back per-step
 *   results.
 *
 *   This route deliberately ships as a SYNCHRONOUS, IN-PROCESS STUB:
 *
 *     - Inputs are validated against a closed `playbookId` enum derived
 *       from `DEFAULT_ATEMI_PLAYBOOKS`. Unknown ids → 400.
 *     - Each step in the playbook's `toolChain` is replayed against the
 *       fixture corpus and a synthetic `PlaybookStepResult` row is built
 *       per step (`status='replayed', evidenceHash=null`). NO live model
 *       traffic, NO bu-tpi probe-runner is invoked, NO budget is debited.
 *     - The shape of `results[]` is forward-compatible: the real engine
 *       will populate the same fields (`stepIndex`, `toolId`, `toolName`,
 *       `status`, `elapsedMs`) so the UI mounts on stable data once the
 *       engine ships behind a follow-up ticket.
 *
 *   Why a stub:
 *     1. A real engine would need driver auth, budget ledger, kill-switch
 *        coupling, R-T1 redaction at the per-step boundary, and a streaming
 *        response — each is a multi-hour ticket on its own.
 *     2. The V1 Atemi UI never had a working PlaybookRunner either; it
 *        rendered against synthetic results post-launch. Shipping a stub
 *        restores V1 surface parity without rewriting the engine first.
 *     3. The operator workflow gap right now is the disabled "Run" button
 *        in `PlaybooksTab` — graduating that button to wire into a real
 *        endpoint unblocks UAT, even with synthetic backend results.
 *
 *   Real engine lands in: TICKET-T-508-ENGINE (queued post-Wave 8).
 *
 * Auth + R-T1
 * -----------
 *   - `withAuth({ role: 'admin' })` — same gate as /api/admin/atemi/probe.
 *   - `mode` is a closed enum {`replay`,`dry-run`} — both today produce
 *     the same synthetic shape; `dry-run` only changes the audit-log
 *     `scanType` so SecOps can grep replays separately.
 *   - Response carries no payload text, no seed strings, no live target
 *     output. Per-step `evidenceHash` is `null` until the engine ships.
 *   - Audit log entry: one `scanExecuted` per request with operator id +
 *     `scanType='atemi.playbook.replay'` + `findings=results.length`.
 *
 * Closed enums
 * ------------
 *   - `PlaybookId`     : runtime set built from `DEFAULT_ATEMI_PLAYBOOKS`.
 *   - `RunMode`        : 'replay' | 'dry-run'.
 *   - `RunStatus`      : 'complete' | 'error'.
 *   - `StepStatus`     : 'replayed' | 'skipped'.
 *
 * Body caps
 * ---------
 *   - playbookId  : ID_MAX = 64
 *   - modelId     : MODEL_ID_MAX = 64
 *   - mode (opt)  : closed-enum
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
  DEFAULT_ATEMI_PLAYBOOKS,
  DEFAULT_ATEMI_ATTACK_TOOLS,
  type AtemiPlaybook,
} from '@/lib/atemi/fixtures';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const ID_MAX = 64;
const MODEL_ID_MAX = 64;
const SAFE_ID = /^[A-Za-z0-9._-]+$/;

// NOTE: closed-enum vocabulary + types previously exported from this
// file have been demoted to module-local because Next.js 16's route
// validator only permits canonical Route export fields (HTTP verbs,
// `dynamic`, `runtime`, etc.). No external consumer imported these
// names from `./route`; UI surfaces define their own sanitize-layer
// vocabularies in `(shell)/admin/atemi/`.
const RUN_MODES = ['replay', 'dry-run'] as const;
type RunMode = (typeof RUN_MODES)[number];

const RUN_STATUSES = ['complete', 'error'] as const;
type RunStatus = (typeof RUN_STATUSES)[number];

const STEP_STATUSES = ['replayed', 'skipped'] as const;
type StepStatus = (typeof STEP_STATUSES)[number];

// Closed string-union for the `reason` field. Pass-4 security fold-in:
// previously typed as `readonly reason?: string`, which would let the
// real engine (T-508-ENGINE) populate `reason` from upstream error
// messages or fixture freeform fields without going through a closed-
// vocabulary gate. Closing the type at the stub stage forces every
// future emitter to add new reason codes here, preventing accidental
// internal-string leakage.
const STEP_SKIP_REASONS = ['tool-not-in-corpus'] as const;
type StepSkipReason = (typeof STEP_SKIP_REASONS)[number];

interface PlaybookStepResult {
  readonly stepIndex: number;
  readonly toolId: string;
  readonly toolName: string;
  readonly status: StepStatus;
  readonly reason?: StepSkipReason;
  readonly elapsedMs: number;
  readonly evidenceHash: null;
}

interface PlaybookRunResponse {
  readonly runId: string;
  readonly status: RunStatus;
  readonly playbookId: string;
  readonly modelId: string;
  readonly mode: RunMode;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly results: readonly PlaybookStepResult[];
  readonly stub: true;
}

const bodySchema = z
  .object({
    playbookId: z.string().min(1).max(ID_MAX).regex(SAFE_ID),
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
      error: 'KILL_ATEMI kill-switch is active — playbook run refused',
      code: 'ATEMI.KILLSWITCH.ACTIVE',
    },
    { status: 403, headers: RESPONSE_HEADERS },
  );
}

function findPlaybook(id: string): AtemiPlaybook | undefined {
  return DEFAULT_ATEMI_PLAYBOOKS.find((p) => p.id === id);
}

function toolNameFor(toolId: string): string {
  const tool = DEFAULT_ATEMI_ATTACK_TOOLS.find((t) => t.id === toolId);
  return tool?.name ?? '(unresolved tool)';
}

/**
 * Synthesize a per-step replay row. The real engine will replace this
 * function with a driver-backed dispatcher; the response shape here is
 * the contract the UI consumes today.
 */
function buildStepResults(
  playbook: AtemiPlaybook,
): readonly PlaybookStepResult[] {
  const baselineMs = 50;
  return playbook.toolChain.map((toolId, index) => {
    const tool = DEFAULT_ATEMI_ATTACK_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return {
        stepIndex: index,
        toolId,
        toolName: '(unresolved tool)',
        status: 'skipped' as const,
        reason: 'tool-not-in-corpus',
        elapsedMs: 0,
        evidenceHash: null,
      };
    }
    return {
      stepIndex: index,
      toolId,
      toolName: toolNameFor(toolId),
      status: 'replayed' as const,
      elapsedMs: baselineMs,
      evidenceHash: null,
    };
  });
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

    // Pass-1 security fold-in: `enforceGuardMode('inbound', ...)` so
    // when the platform guard mode is `samurai` or `hattori`
    // (block inbound) the playbook run is refused before any audit-log
    // write or stub-engine work. Even at stub-engine maturity this
    // prevents the audit log from recording SCAN_EXECUTED while
    // operator policy says inbound probes are forbidden; when
    // T-508-ENGINE swaps in real model calls, the gate is already in
    // place. `enforceGuardMode` itself emits a GUARD_MODE_BLOCK audit
    // row when it blocks (see lib/guard-mode.ts), so the block is
    // logged + the execution is not — truth-in-audit preserved.
    //
    // Ordering note: identity check (operatorId) precedes the
    // guard-mode call here, intentionally diverging from the sibling
    // `/api/admin/atemi/probe` route which calls guard-mode first.
    // The playbook ordering is the safer one — passing a verified
    // non-empty `operatorId` into `enforceGuardMode` ensures the
    // GUARD_MODE_BLOCK audit row always carries a real operator id;
    // the probe route's earlier guard-then-identity ordering would
    // emit a row with operatorId=''. The probe route should be
    // realigned in a follow-up; this PR keeps the safer ordering.
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

    const playbook = findPlaybook(parsed.playbookId);
    if (!playbook) {
      return NextResponse.json(
        { error: 'playbook not found', code: 'ATEMI.PLAYBOOK.UNKNOWN' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const mode: RunMode = parsed.mode ?? 'replay';
    const startedAt = new Date();
    const results = buildStepResults(playbook);
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const runId = `pbrun-${randomUUID()}`;

    const response: PlaybookRunResponse = {
      runId,
      status: 'complete',
      playbookId: playbook.id,
      modelId: parsed.modelId,
      mode,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      results,
      stub: true,
    };

    try {
      await auditLog.scanExecuted({
        endpoint: '/api/atemi/playbook/run',
        user: operatorId,
        scanType: mode === 'dry-run'
          ? 'atemi.playbook.dry-run'
          : 'atemi.playbook.replay',
        findings: results.length,
        durationMs,
      });
    } catch (err) {
      // Audit log failure must not poison the response — log server-side
      // and continue. The route's main contract is the synthetic result;
      // audit-log durability is enforced at the logger layer.
      console.error('[atemi/playbook/run] audit log failed', err);
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
