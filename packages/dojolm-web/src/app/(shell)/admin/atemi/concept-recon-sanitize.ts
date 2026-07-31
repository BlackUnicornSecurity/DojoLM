// SPDX-License-Identifier: Apache-2.0
/**
 * ConceptReconPanel response-sanitization helpers + closed-record label
 * maps — TICKET-T-509 fold-1.
 *
 * Extracted from `ConceptReconPanel.tsx` per pass-1 review (MED Code-2:
 * panel ≤400 lines). Houses:
 *   - The closed-enum step-status tuple +
 *     `Object.freeze(... as const satisfies readonly string[])` discipline.
 *   - The "raw response" wire-shape interfaces.
 *   - `sanitizeStep` / `sanitizeModelId` / `sanitizeResponse` helpers
 *     that gate every untrusted server payload before it touches React
 *     state.
 *   - The closed-record label / badge maps consumed by the panel JSX
 *     (kept here so the panel file stays under the 400-line ceiling).
 *
 * Closed-enum + `as const satisfies` discipline (T-508 fold-4 precedent):
 *   Adding a new value forces every consumer site to recompile.
 *
 * R-T1 / Pass-1 review hardening:
 *   - Every sanitize helper rejects (returns null / drops) any field
 *     that does not satisfy the closed-enum or numeric-bound checks.
 *     Untrusted server payloads can never widen the React state
 *     surface beyond the declared `ConceptReconStepLite` shape.
 */

// Atemi-PR-2 — narrow sub-path import per
// the darwin-perf import rule.
import { cap } from '@/design/primitives/_caps';

const MODEL_ID_MAX = 64;
const STEP_ID_MAX = 64;
const STEP_NAME_MAX = 120;
const SUMMARY_TEXT_MAX = 240;
const RUN_ID_MAX = 64;
const SAFE_ID_RE = /[^A-Za-z0-9._-]/g;

// Closed-enum tuples — frozen + `as const satisfies readonly string[]`
// per T-508 fold-4 precedent.
export const CONCEPT_RECON_STEP_STATUSES = Object.freeze(
  ['ok', 'warning', 'skipped'] as const satisfies readonly string[],
);
export type ConceptReconStepStatus = (typeof CONCEPT_RECON_STEP_STATUSES)[number];

export const CONCEPT_RECON_RUN_MODES = Object.freeze(
  ['fast', 'thorough'] as const satisfies readonly string[],
);
export type ConceptReconRunMode = (typeof CONCEPT_RECON_RUN_MODES)[number];

export const CONCEPT_RECON_RUN_STATUSES = Object.freeze(
  ['idle', 'running', 'complete', 'error'] as const satisfies readonly string[],
);
export type ConceptReconRunStatus = (typeof CONCEPT_RECON_RUN_STATUSES)[number];

// Closed-record label / badge maps. Frozen at module load so React
// renders against immutable data. No string-template fallbacks anywhere.
export const STATUS_LABEL: Readonly<Record<ConceptReconRunStatus, string>> = Object.freeze({
  idle: 'Ready',
  running: 'Analyzing…',
  complete: 'Complete',
  error: 'Error',
});

export const STATUS_BADGE_CLASS: Readonly<Record<ConceptReconRunStatus, string>> = Object.freeze({
  idle: 'wb-badge muted',
  running: 'wb-badge warn',
  complete: 'wb-badge ok',
  error: 'wb-badge alert',
});

export const STEP_STATUS_LABEL: Readonly<Record<ConceptReconStepStatus, string>> = Object.freeze({
  ok: 'OK',
  warning: 'Warning',
  skipped: 'Skipped',
});

export const STEP_BADGE_CLASS: Readonly<Record<ConceptReconStepStatus, string>> = Object.freeze({
  ok: 'wb-badge ok',
  warning: 'wb-badge warn',
  skipped: 'wb-badge muted',
});

export const MODE_LABEL: Readonly<Record<ConceptReconRunMode, string>> = Object.freeze({
  fast: 'Fast (skip deep walk)',
  thorough: 'Thorough (5 steps)',
});

export interface RawStepResult {
  readonly stepIndex?: unknown;
  readonly stepId?: unknown;
  readonly stepName?: unknown;
  readonly status?: unknown;
  readonly elapsedMs?: unknown;
  readonly reason?: unknown;
}

export interface RawConceptReconResponse {
  readonly runId?: unknown;
  readonly status?: unknown;
  readonly modelId?: unknown;
  readonly mode?: unknown;
  readonly durationMs?: unknown;
  readonly steps?: readonly unknown[];
  readonly summary?: unknown;
  readonly decomposedConcepts?: readonly unknown[];
  readonly stub?: unknown;
  readonly error?: unknown;
}

export interface ConceptReconStepLite {
  readonly stepIndex: number;
  readonly stepId: string;
  readonly stepName: string;
  readonly status: ConceptReconStepStatus;
  readonly elapsedMs: number;
}

export interface SanitizedRunSummary {
  readonly runId: string;
  readonly durationMs: number;
  readonly stub: boolean;
  readonly steps: readonly ConceptReconStepLite[];
  readonly summary: string;
  readonly decomposedConcepts: readonly string[];
}

export function isStepStatus(v: unknown): v is ConceptReconStepStatus {
  return typeof v === 'string'
    && (CONCEPT_RECON_STEP_STATUSES as readonly string[]).includes(v);
}

export function sanitizeModelId(raw: string): string {
  const stripped = raw.replace(SAFE_ID_RE, '');
  return cap(stripped, MODEL_ID_MAX);
}

export function sanitizeStep(raw: unknown, index: number): ConceptReconStepLite | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as RawStepResult;
  if (typeof r.stepId !== 'string') return null;
  if (typeof r.stepName !== 'string') return null;
  if (!isStepStatus(r.status)) return null;
  const stepIndex = typeof r.stepIndex === 'number' ? r.stepIndex : index;
  const elapsedMs = typeof r.elapsedMs === 'number' && r.elapsedMs >= 0
    ? r.elapsedMs
    : 0;
  return {
    stepIndex,
    stepId: cap(r.stepId, STEP_ID_MAX),
    stepName: cap(r.stepName, STEP_NAME_MAX),
    status: r.status,
    elapsedMs,
  };
}

/**
 * Single-pass response sanitizer — folds the formerly-mutable
 * `safeSteps.push` / `safeConcepts.push` accumulators into a single
 * `flatMap`-driven pure pipeline. Pass-1 review MED Code-3 fix.
 */
export function sanitizeResponse(body: RawConceptReconResponse): SanitizedRunSummary {
  const rawSteps = Array.isArray(body.steps) ? body.steps : [];
  const safeSteps = rawSteps.flatMap<ConceptReconStepLite>((step, index) => {
    const safe = sanitizeStep(step, index);
    return safe ? [safe] : [];
  });
  const rawConcepts = Array.isArray(body.decomposedConcepts)
    ? body.decomposedConcepts
    : [];
  const safeConcepts = rawConcepts.flatMap<string>((c) =>
    typeof c === 'string' && c.length > 0 ? [cap(c, STEP_NAME_MAX)] : [],
  );
  return {
    runId: typeof body.runId === 'string' ? cap(body.runId, RUN_ID_MAX) : '',
    durationMs: typeof body.durationMs === 'number' ? body.durationMs : 0,
    stub: body.stub === true,
    steps: safeSteps,
    summary: typeof body.summary === 'string' ? cap(body.summary, SUMMARY_TEXT_MAX) : '',
    decomposedConcepts: safeConcepts,
  };
}
