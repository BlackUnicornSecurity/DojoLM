// SPDX-License-Identifier: Apache-2.0
/**
 * In-memory race-plan state store.
 *
 * Bridges the stateless POST /api/admin/eval/race staging endpoint to the
 * GET /api/admin/eval/race/stream SSE consumer. The POST handler stages a
 * plan via `stageRace(raceId, plan)`; the SSE handler reads the entry via
 * `consumeRace(raceId)` and emits the deterministic event sequence the
 * /admin/eval/run UI consumes.
 *
 * Yamabushi follow-up audit (2026-04-25): closes the FE↔BE coverage gap
 * for `/api/admin/eval/race/stream` flagged in the implementation-plan
 * audit. The orchestration is intentionally a deterministic stub — real
 * race execution lands when the orchestrator surface ships.
 *
 * State is in-process. Suitable for a single-instance dev/test deployment;
 * a horizontally-scaled production deployment would back this with Redis
 * or replace the SSE with a poll-based status surface — see plan §13.2.
 *
 * R-T1: prompt content is NOT stored. Only the model list, mutator flag,
 * and creation timestamp are kept (plus an optional prompt-hash echoed
 * back into the audit trail when execution begins).
 *
 * TTL: entries expire 5 minutes after staging. Stale entries are swept
 * lazily on every read so a never-consumed plan can't leak indefinitely.
 */

export interface StagedRace {
  readonly raceId: string;
  readonly modelIds: readonly string[];
  readonly mutatorEnabled: boolean;
  readonly stagedAt: number;
}

const TTL_MS = 5 * 60 * 1000;

declare global {
  // Persist across hot-module reloads in dev so a staging POST and a
  // subsequent SSE GET in the same dev session find the same store.
  // eslint-disable-next-line no-var
  var __dojolm_active_races: Map<string, StagedRace> | undefined;
}

const activeRaces: Map<string, StagedRace> =
  globalThis.__dojolm_active_races ??
  (globalThis.__dojolm_active_races = new Map<string, StagedRace>());

function sweepStale(now: number): void {
  for (const [id, race] of activeRaces) {
    if (now - race.stagedAt > TTL_MS) {
      activeRaces.delete(id);
    }
  }
}

export function stageRace(plan: StagedRace): void {
  const now = Date.now();
  sweepStale(now);
  activeRaces.set(plan.raceId, plan);
}

export function consumeRace(raceId: string): StagedRace | undefined {
  const now = Date.now();
  sweepStale(now);
  const plan = activeRaces.get(raceId);
  if (!plan) return undefined;
  // SSE consumes once. Real orchestration will manage lifecycle differently.
  activeRaces.delete(raceId);
  return plan;
}

export function peekRace(raceId: string): StagedRace | undefined {
  sweepStale(Date.now());
  return activeRaces.get(raceId);
}

// Test hook — reset state between specs.
export function __resetRaceState(): void {
  activeRaces.clear();
}
