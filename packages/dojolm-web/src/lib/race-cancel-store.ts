// SPDX-License-Identifier: Apache-2.0
/**
 * race-cancel-store — in-process cancellation marker for SSE races.
 *
 * Story: YR.1.2 (yamabushi restoration plan).
 *
 * The eval-race SSE stream loop (src/app/api/admin/eval/race/stream) polls
 * `isCancelled(raceId)` between progress events. POST /api/admin/eval/race/cancel
 * sets the marker via `markCancelled()`. The store mirrors the race-state
 * pattern (in-process Map, globalThis singleton for HMR survival). It is
 * intentionally not persistent — race lifetimes are < 5 minutes and the
 * cancellation only needs to outlive the SSE handler that consumes it.
 *
 * Cancellation entries TTL out 5 minutes after creation so a never-emitted
 * cancel cannot leak indefinitely.
 *
 * R-T1: stores only `raceId`, the canceller's user-id, an ISO timestamp,
 * and a fixed-vocabulary reason code. No prompt / confirm-phrase / free-
 * form text is recorded.
 */

export type RaceCancelReason = 'operator-confirmed';

export interface RaceCancellation {
  readonly raceId: string;
  readonly cancelledAt: string;
  readonly cancelledBy: string;
  readonly reason: RaceCancelReason;
}

const TTL_MS = 5 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __dojolm_race_cancellations: Map<string, RaceCancellation> | undefined;
  // eslint-disable-next-line no-var
  var __dojolm_active_race_lifecycles: Map<string, number> | undefined;
}

const cancellations: Map<string, RaceCancellation> =
  globalThis.__dojolm_race_cancellations ??
  (globalThis.__dojolm_race_cancellations = new Map<string, RaceCancellation>());

const activeLifecycles: Map<string, number> =
  globalThis.__dojolm_active_race_lifecycles ??
  (globalThis.__dojolm_active_race_lifecycles = new Map<string, number>());

function sweepStale(now: number): void {
  for (const [id, c] of cancellations) {
    if (now - new Date(c.cancelledAt).getTime() > TTL_MS) {
      cancellations.delete(id);
    }
  }
  for (const [id, ts] of activeLifecycles) {
    if (now - ts > TTL_MS) {
      activeLifecycles.delete(id);
    }
  }
}

export function markRaceActive(raceId: string): void {
  sweepStale(Date.now());
  activeLifecycles.set(raceId, Date.now());
}

export function markRaceComplete(raceId: string): void {
  sweepStale(Date.now());
  activeLifecycles.delete(raceId);
}

export function isRaceActive(raceId: string): boolean {
  sweepStale(Date.now());
  return activeLifecycles.has(raceId);
}

export function markCancelled(input: {
  readonly raceId: string;
  readonly cancelledBy: string;
  readonly reason?: RaceCancelReason;
  readonly nowIso?: string;
}): RaceCancellation {
  const now = Date.now();
  sweepStale(now);
  const record: RaceCancellation = Object.freeze({
    raceId: input.raceId,
    cancelledAt: input.nowIso ?? new Date(now).toISOString(),
    cancelledBy: input.cancelledBy,
    reason: input.reason ?? 'operator-confirmed',
  });
  cancellations.set(input.raceId, record);
  return record;
}

/**
 * YR.1.2 audit pass-1 M1: atomic check-then-set.
 *
 * Returns `{ ok: false }` if the raceId is already in the cancellation
 * map after the same `sweepStale()` pass that gates the write — closes
 * the TOCTOU window the route's previous read–check–write sequence had
 * between two concurrent admin requests on the same raceId.
 */
export function markCancelledIfNotAlready(input: {
  readonly raceId: string;
  readonly cancelledBy: string;
  readonly reason?: RaceCancelReason;
  readonly nowIso?: string;
}): { readonly ok: boolean; readonly record: RaceCancellation } {
  const now = Date.now();
  sweepStale(now);
  const existing = cancellations.get(input.raceId);
  if (existing) return { ok: false, record: existing };
  const record: RaceCancellation = Object.freeze({
    raceId: input.raceId,
    cancelledAt: input.nowIso ?? new Date(now).toISOString(),
    cancelledBy: input.cancelledBy,
    reason: input.reason ?? 'operator-confirmed',
  });
  cancellations.set(input.raceId, record);
  return { ok: true, record };
}

export function isCancelled(raceId: string): boolean {
  sweepStale(Date.now());
  return cancellations.has(raceId);
}

export function getCancellation(raceId: string): RaceCancellation | undefined {
  sweepStale(Date.now());
  return cancellations.get(raceId);
}

/** Test hook — reset both maps between specs. */
export function __resetRaceCancelStateForTests(): void {
  cancellations.clear();
  activeLifecycles.clear();
}
