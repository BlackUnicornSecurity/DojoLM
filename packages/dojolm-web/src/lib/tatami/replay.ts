// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/replay — replay request/result schema + builder (OSS, Epic 6 / P2.1).
 *
 * The OSS half of replay: schema + a pure builder over already-captured facts.
 * OSS replay is **cached or deterministic only** — `TatamiReplayMode` has no
 * `live` member, so a live provider call is structurally impossible from here
 * (live replay is the EE `tatami-vault` surface: queued, budget-gated,
 * harmful-content-acked).
 *
 * Two invariants enforced by {@link buildReplayResult}:
 *   1. An unsafe proof cannot be replayed — `not_replayable` throws a
 *      {@link ReplayBlockedError} carrying the reason codes (acceptance: "unsafe
 *      replay blocked with a reason").
 *   2. **Cached replay never claims reproducibility** (F-Eval) — re-reading a
 *      stored record proves nothing, so `cached_no_reexecution` always pins
 *      `reproducibilityClaimed = false` regardless of the source's axis.
 *
 * Pure + deterministic: no I/O, no clock, no provider call.
 */

import type { TatamiDelta } from './replay-delta';
import type { ReplaySafetyVerdict } from './replay-safety';
import type {
  TatamiReplayExecution,
  TatamiReplaySafetyReason,
  TatamiReproducibility,
} from './types';
import { TATAMI_SCHEMA_VERSION } from './types';

/** OSS replay modes. `live` is intentionally absent — it is EE-only. */
export type TatamiReplayMode = 'cached' | 'deterministic';

/**
 * OSS executions — the EE `live_reexecuted` is excluded at the type level so an
 * OSS replay result cannot even be *assigned* a live execution, not merely
 * rejected at runtime (Invariant 2, statically enforced).
 */
export type OssTatamiReplayExecution = Exclude<TatamiReplayExecution, 'live_reexecuted'>;

/** Max length of an optional free-form replay `note` (bounded at the boundary). */
export const MAX_TATAMI_REPLAY_NOTE_LEN = 512;
/** Max length of any string field on a {@link TatamiReplayObservation}. */
export const MAX_TATAMI_REPLAY_OBSERVATION_STRING_LEN = 256;

export interface TatamiReplayRequest {
  readonly sourceProofId: string;
  readonly mode: TatamiReplayMode;
}

/**
 * A single replay observation — structured facts only, never raw payload. The
 * source module decides which scalars it can expose customer-safely; `metrics`
 * is the numeric channel that {@link TatamiDelta} is derived from.
 */
export interface TatamiReplayObservation {
  readonly outputHash?: string;
  readonly verdict?: string;
  readonly refusalClass?: string;
  readonly severity?: string;
  readonly metrics?: Readonly<Record<string, number>>;
}

export interface TatamiReplayResult {
  readonly schemaVersion: number;
  readonly sourceProofId: string;
  readonly mode: TatamiReplayMode;
  readonly execution: OssTatamiReplayExecution;
  /** False for any cached replay (it re-reads a record and proves nothing). */
  readonly reproducibilityClaimed: boolean;
  readonly observations: readonly TatamiReplayObservation[];
  readonly deltas: readonly TatamiDelta[];
  /** The pre-replay safety verdict this result was built under. */
  readonly safety: ReplaySafetyVerdict;
  readonly note?: string;
}

export interface BuildReplayResultParams {
  readonly sourceProofId: string;
  readonly mode: TatamiReplayMode;
  /** The pre-replay verdict from `classifyReplaySafety`. */
  readonly safety: ReplaySafetyVerdict;
  readonly observations: readonly TatamiReplayObservation[];
  readonly deltas?: readonly TatamiDelta[];
  /** Source proof's reproducibility axis — gates the deterministic claim. */
  readonly reproducibility?: TatamiReproducibility;
  readonly note?: string;
}

/** Thrown when a replay is attempted against a `not_replayable` proof. */
export class ReplayBlockedError extends Error {
  readonly reasons: readonly TatamiReplaySafetyReason[];
  constructor(reasons: readonly TatamiReplaySafetyReason[]) {
    super(`replay blocked: ${reasons.join(', ') || 'not_replayable'}`);
    this.name = 'ReplayBlockedError';
    this.reasons = reasons;
  }
}

const EXECUTION_FOR_MODE: Readonly<Record<TatamiReplayMode, OssTatamiReplayExecution>> = {
  cached: 'cached_no_reexecution',
  deterministic: 'deterministic_reexecuted',
};

/** Reject over-long observation strings / non-finite metrics at the boundary. */
function assertObservationsBounded(observations: readonly TatamiReplayObservation[]): void {
  for (const o of observations) {
    for (const field of [o.outputHash, o.verdict, o.refusalClass, o.severity]) {
      if (field !== undefined && field.length > MAX_TATAMI_REPLAY_OBSERVATION_STRING_LEN) {
        throw new Error(
          `replay observation field exceeds ${MAX_TATAMI_REPLAY_OBSERVATION_STRING_LEN} chars`,
        );
      }
    }
    if (o.metrics) {
      for (const value of Object.values(o.metrics)) {
        if (!Number.isFinite(value)) throw new Error('replay observation metric must be finite');
      }
    }
  }
}

/**
 * Build an OSS replay result over `observations`. Throws {@link ReplayBlockedError}
 * if the safety verdict is `not_replayable`, and a plain Error if a bound is
 * exceeded (note length, observation string length, non-finite metric). A cached
 * replay always reports `reproducibilityClaimed = false`; a deterministic replay
 * may claim it only when the source proof's reproducibility is `deterministic`.
 */
export function buildReplayResult(params: BuildReplayResultParams): TatamiReplayResult {
  if (params.safety.safety === 'not_replayable') {
    throw new ReplayBlockedError(params.safety.reasons);
  }
  if (params.note !== undefined && params.note.length > MAX_TATAMI_REPLAY_NOTE_LEN) {
    throw new Error(`replay note exceeds ${MAX_TATAMI_REPLAY_NOTE_LEN} chars`);
  }
  assertObservationsBounded(params.observations);
  const execution = EXECUTION_FOR_MODE[params.mode];
  const reproducibilityClaimed =
    params.mode === 'deterministic' && params.reproducibility === 'deterministic';

  return {
    schemaVersion: TATAMI_SCHEMA_VERSION,
    sourceProofId: params.sourceProofId,
    mode: params.mode,
    execution,
    reproducibilityClaimed,
    observations: params.observations,
    deltas: params.deltas ?? [],
    safety: params.safety,
    ...(params.note !== undefined ? { note: params.note } : {}),
  };
}

const REPLAY_MODES: ReadonlySet<string> = new Set(['cached', 'deterministic']);
const REPLAY_EXECUTIONS: ReadonlySet<string> = new Set([
  'cached_no_reexecution',
  'deterministic_reexecuted',
]);

/** A non-null object whose `.safety` is a string and `.reasons` an array. */
function hasWellShapedVerdict(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.safety === 'string' && Array.isArray(s.reasons);
}

/**
 * Read-side guard for a replay result. Defends a deserialized/cross-tier record
 * against every way it could misrepresent an OSS replay:
 *   - rejects the EE `live_reexecuted` execution (never OSS-built);
 *   - requires `mode` and `execution` to AGREE (a cached read can't be a
 *     deterministic re-exec, and vice-versa);
 *   - re-asserts cached-never-reproducible;
 *   - requires a well-shaped `safety` verdict and a bounded `note`.
 */
export function isTatamiReplayResult(v: unknown): v is TatamiReplayResult {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  if (
    typeof r.schemaVersion !== 'number'
    || typeof r.sourceProofId !== 'string'
    || r.sourceProofId.length === 0
    || typeof r.mode !== 'string'
    || !REPLAY_MODES.has(r.mode)
    || typeof r.execution !== 'string'
    || !REPLAY_EXECUTIONS.has(r.execution)
    || typeof r.reproducibilityClaimed !== 'boolean'
    || !Array.isArray(r.observations)
    || !Array.isArray(r.deltas)
    || !hasWellShapedVerdict(r.safety)
  ) {
    return false;
  }
  // mode ↔ execution must agree (also re-rejects live_reexecuted).
  if (EXECUTION_FOR_MODE[r.mode as TatamiReplayMode] !== r.execution) return false;
  // Cached replay must never claim reproducibility.
  if (r.execution === 'cached_no_reexecution' && r.reproducibilityClaimed === true) return false;
  // An optional note must be a bounded string.
  if (
    r.note !== undefined
    && (typeof r.note !== 'string' || r.note.length > MAX_TATAMI_REPLAY_NOTE_LEN)
  ) {
    return false;
  }
  return true;
}
