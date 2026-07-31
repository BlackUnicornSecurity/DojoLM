// SPDX-License-Identifier: Apache-2.0
/**
 * Concept-recon stub engine — TICKET-T-509 (T7-5 backend graduation).
 *
 * Extracted from `route.ts` per pass-1 review (MED Code-2: route.ts ≤300 lines).
 * Houses closed-enum constants, type definitions, the deterministic 5-step
 * pipeline, and the synthesizer helpers (`buildStepResults`,
 * `deriveDecomposedConcepts`, `buildSummary`). The route file re-exports
 * the public types so existing import paths continue to resolve.
 *
 * Stub status — same caveat as `route.ts`: this file ships synthetic
 * results derived from a deterministic 5-step pipeline. The real engine
 * (TICKET-T-509-ENGINE) replaces these helper bodies without touching
 * the closed-enum vocabulary.
 *
 * Closed-enum + `as const satisfies` discipline (T-508 fold-4 precedent):
 *   - RUN_MODES, STEP_STATUSES, STEP_SKIP_REASONS, KNOWN_CORPUS_MODELS
 *     are all `Object.freeze(... as const satisfies readonly string[])`.
 *   - Adding a new value forces every consumer site to recompile.
 */

// Closed run-mode enum — `fast` skips the graph-walk and corpus-cross-ref
// steps; `thorough` runs all 5.
export const RUN_MODES = Object.freeze(
  ['fast', 'thorough'] as const satisfies readonly string[],
);
export type RunMode = (typeof RUN_MODES)[number];

// Closed run-status enum — terminal states only; the response always
// settles into one of these before being serialized.
export const RUN_STATUSES = Object.freeze(
  ['complete', 'error'] as const satisfies readonly string[],
);
export type RunStatus = (typeof RUN_STATUSES)[number];

// Closed step-status enum — `as const satisfies readonly string[]`
// per T-508 security-fold-4 precedent. Guarantees the type is a
// readonly tuple of string literals while still narrowing to the
// closed set at consumption sites.
export const STEP_STATUSES = Object.freeze(
  ['ok', 'warning', 'skipped'] as const satisfies readonly string[],
);
export type StepStatus = (typeof STEP_STATUSES)[number];

// Closed string-union for the `reason` field (T-508 fold-4 precedent).
// Closing the type at the stub stage forces every future emitter to
// add new reason codes here, preventing accidental internal-string
// leakage when T-509-ENGINE swaps in real decomposition output.
export const STEP_SKIP_REASONS = Object.freeze(
  ['model-not-in-corpus', 'mode-fast-skipped'] as const satisfies readonly string[],
);
export type StepSkipReason = (typeof STEP_SKIP_REASONS)[number];

// Closed fixture allowlist — only model ids in this set are considered
// "in corpus" for the stub engine. An unknown model id routes the
// pipeline through the `model-not-in-corpus` skip reason. Real engine
// (TICKET-T-509-ENGINE) replaces this with a live registry lookup.
//
// Membership reflects the model ids that the rest of the V2 corpus
// already references (see `lib/llm-constants.ts`, demo mock-models, and
// historical T-509 happy-path tests using `'dojolm-prod'` / `'dojolm'`).
export const KNOWN_CORPUS_MODELS = Object.freeze(
  [
    'dojolm-prod',
    'dojolm',
    // E-01 (generic-names): demo corpus ids come from the one registry of
    // record (`lib/demo/mock-models.ts`, model-a…h) — never vendor names.
    'model-a',
    'model-b',
    'model-c',
    'model-d',
  ] as const satisfies readonly string[],
);

export interface ConceptReconStepResult {
  readonly stepIndex: number;
  readonly stepId: string;
  readonly stepName: string;
  readonly status: StepStatus;
  readonly reason?: StepSkipReason;
  readonly elapsedMs: number;
}

export interface ConceptReconResponse {
  readonly runId: string;
  readonly status: RunStatus;
  readonly modelId: string;
  readonly mode: RunMode;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly steps: readonly ConceptReconStepResult[];
  readonly summary: string;
  readonly decomposedConcepts: readonly string[];
  readonly stub: true;
}

// Closed-record pipeline definition. Each step has a fixed id + display
// name. The `skipInFastMode` flag drives the closed-vocabulary skip
// reason returned by the stub engine. Real engine swaps step bodies
// without touching ids.
export const PIPELINE_STEPS = Object.freeze([
  Object.freeze({ id: 'tokenize', name: 'Tokenize input text', skipInFastMode: false }),
  Object.freeze({ id: 'concept-extract', name: 'Extract candidate concepts', skipInFastMode: false }),
  Object.freeze({ id: 'graph-walk', name: 'Walk concept graph', skipInFastMode: true }),
  Object.freeze({ id: 'recon-rank', name: 'Rank recon targets', skipInFastMode: false }),
  Object.freeze({ id: 'corpus-cross-ref', name: 'Cross-reference fixture corpus', skipInFastMode: true }),
] as const);

/**
 * Stub-engine: derive a deterministic decomposed-concept list from the
 * input length. Real engine replaces this with NLP extraction; the
 * shape (string array of capped concept labels) is the forward-compat
 * contract the UI consumes.
 */
export function deriveDecomposedConcepts(
  inputLength: number,
  mode: RunMode,
): readonly string[] {
  const bucket = Math.min(5, Math.max(1, Math.floor(inputLength / 200) + 1));
  const base = [
    'concept.alpha',
    'concept.beta',
    'concept.gamma',
    'concept.delta',
    'concept.epsilon',
  ] as const;
  const taken = mode === 'fast' ? Math.min(3, bucket) : bucket;
  return Object.freeze(base.slice(0, taken));
}

/**
 * Synthesize per-step recon results. The real engine will replace this
 * function with a driver-backed NLP pipeline; the response shape here
 * is the contract the UI consumes today.
 *
 * `modelInCorpus` is now a real fixture-allowlist check against
 * `KNOWN_CORPUS_MODELS` (was a tautological `SAFE_ID.test(modelId)` in
 * pass-0 — pass-1 review MED Code-1 + MED Sec-2 fix). Unknown model ids
 * route every step through the `model-not-in-corpus` skip reason.
 */
export function buildStepResults(
  inputLength: number,
  modelId: string,
  mode: RunMode,
): readonly ConceptReconStepResult[] {
  const baselineMs = 25;
  const modelInCorpus = (KNOWN_CORPUS_MODELS as readonly string[]).includes(modelId);
  return PIPELINE_STEPS.map((step, index) => {
    if (mode === 'fast' && step.skipInFastMode) {
      return {
        stepIndex: index,
        stepId: step.id,
        stepName: step.name,
        status: 'skipped' as const,
        reason: 'mode-fast-skipped' as const,
        elapsedMs: 0,
      };
    }
    if (!modelInCorpus) {
      return {
        stepIndex: index,
        stepId: step.id,
        stepName: step.name,
        status: 'skipped' as const,
        reason: 'model-not-in-corpus' as const,
        elapsedMs: 0,
      };
    }
    // Synthesize a "warning" status when input is suspiciously short —
    // demonstrates the closed-enum status contract for the real engine.
    const status: StepStatus = inputLength < 32 && step.id === 'concept-extract'
      ? 'warning'
      : 'ok';
    return {
      stepIndex: index,
      stepId: step.id,
      stepName: step.name,
      status,
      elapsedMs: baselineMs + index * 5,
    };
  });
}

export function buildSummary(
  inputLength: number,
  conceptCount: number,
  mode: RunMode,
): string {
  return `Concept-recon stub: analyzed ${inputLength} chars in ${mode} mode; surfaced ${conceptCount} concepts.`;
}
