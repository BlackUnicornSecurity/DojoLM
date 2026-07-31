// SPDX-License-Identifier: Apache-2.0
/**
 * File: race-runner.ts
 * Purpose: Gap 13.2 KUMITE parallel race — multi-model fan-out orchestrator.
 * Story: Industry-tools parity plan §Gap 13.2 (lines 838–890).
 *
 * v1 scope cut: budget-gated parallel race + deterministic scoring +
 * bypass-rate metric. No SSE streaming, no pre-flight UI, no cancel
 * endpoint (those land in Phase F web shell).
 *
 * Core invariants (per spec):
 * 1. Reserve-then-commit (R-K1): the race reserves `reservedCredits`
 *    against the shared ledger BEFORE fan-out; per-card failures never
 *    refund (R-B2). The runner commits the full reservation at the end.
 * 2. Per-model ceiling: each card is capped at `perModelCreditCeiling`;
 *    a card that exceeds its ceiling is marked `budget_denied`.
 * 3. Determinism: given the same (prompt, seed, model adapter set), the
 *    runner produces byte-identical results — scorer is deterministic,
 *    adapters are injected.
 * 4. Flag-gate: when `KUMITE_RACE_ENABLED=false`, `runRace` returns a
 *    frozen empty result without touching the ledger or adapters.
 * 5. R-T1 compliance: emitted telemetry carries hashes + lengths, never
 *    raw prompt/response content.
 *
 * Audit lessons applied:
 * - #176 filename-safe race & model ids.
 * - #178 M-1 root containment — ids rejected if they contain path sep.
 * - #181 M-1 Object.hasOwn for adapter lookup.
 * - #182+#184 bidi strip on prompt before hashing/fan-out.
 * - #185 empty-seed rejection.
 * - Frozen audit entries (per season.ts / #184 lesson).
 */

import { createHash } from 'node:crypto';
import type { BudgetLedger } from '../sensei/budget-ledger.js';
import { stripBidiOverrides } from '../bushido/safety.js';
import {
  CancellationToken,
  KillSwitchAbort,
} from '../flags/kill-switch.js';
import type {
  RaceCard,
  RaceConfig,
  RaceModelAdapter,
  RaceResult,
  RaceTelemetryEvent,
  RefusalClass,
} from './race-types.js';
import { classifyRefusal, scoreRaceBypassRate } from './race-scorer.js';
import { estimateRaceCost, type ModelCostTable } from '../eval/cost-estimator.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const MAX_PROMPT_LEN = 64 * 1024;
const MAX_MODELS = 50;
const MIN_MODELS = 2;

/**
 * Denylist for ids that match `ID_PATTERN` but collide with object-
 * prototype names. Post-#187 L-1: defense-in-depth so an id that escapes
 * into a plain-object lookup cannot hit the prototype chain.
 */
const RESERVED_PROTO_IDS = new Set(['constructor', 'prototype', '__proto__']);

function ensureSafeId(raw: string, kind: string): string {
  if (typeof raw !== 'string') throw new TypeError(`${kind} must be a string`);
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0 || stripped.length > 128) {
    throw new RangeError(`${kind} length must be 1..128`);
  }
  if (!ID_PATTERN.test(stripped)) {
    throw new Error(`${kind} "${stripped}" is not filename-safe`);
  }
  if (RESERVED_PROTO_IDS.has(stripped)) {
    throw new Error(`${kind} "${stripped}" is a reserved prototype name`);
  }
  return stripped;
}

function ensureSeed(raw: string): string {
  if (typeof raw !== 'string') throw new TypeError('seed must be a string');
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0) throw new RangeError('seed must be non-empty');
  if (stripped.length > 256) throw new RangeError('seed length must be ≤ 256');
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(stripped)) {
    throw new Error('seed must not contain control characters');
  }
  return stripped;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RaceRunnerOptions {
  readonly config: RaceConfig;
  readonly adapters: readonly RaceModelAdapter[];
  readonly ledger: BudgetLedger;
  readonly budgetUserId: string;
  readonly flagEnabled: boolean;
  readonly now?: () => Date;
  readonly onTelemetry?: (event: RaceTelemetryEvent) => void;
  /**
   * Optional CancellationToken wired to KILL_KUMITE_RACE. When cancelled:
   *   - BEFORE fan-out (before ledger reserve) → returns cancelled result,
   *     no reservation, no cards.
   *   - Between rounds (mid-fan-out) → in-flight cards finish; remaining
   *     cards return status 'cancelled'.
   *   - Per-card → adapter may observe token to short-circuit its own
   *     work; if the adapter ignores it, the runner still records the
   *     card and marks status 'cancelled' if the token fired.
   * R-F2: propagation is event-driven (no polling); <5s bound depends
   *        on adapter honor of the per-call signal.
   */
  readonly cancellationToken?: CancellationToken;
  /**
   * Per-model cost table in MICRO-USD per 1k tokens (input / output).
   * When provided, the runner emits `kumite.race.cost_estimated` BEFORE
   * ledger reservation. Tables come from the OpenRouter catalog or a
   * static fixture in tests; table read via `Object.hasOwn` semantics.
   */
  readonly costTable?: ModelCostTable;
  /**
   * Optional prompt-token estimator. Defaults to chars/4 heuristic —
   * conservative, deterministic, no tokenizer dependency. Tests can
   * inject a fixed-value estimator.
   */
  readonly estimatePromptTokens?: (prompt: string) => number;
  /** Estimated max completion tokens per model call (default 1024). */
  readonly estimateCompletionTokens?: number;
}

/** Build a frozen empty result for flag-off / early-exit paths. */
function emptyResult(raceId: string, startedAt: string): RaceResult {
  return Object.freeze<RaceResult>({
    raceId,
    startedAt,
    finishedAt: startedAt,
    cards: Object.freeze([]),
    totalCreditsDebited: 0,
    reservedCredits: 0,
    statusCounts: Object.freeze({
      ok: 0,
      error: 0,
      cancelled: 0,
      budget_denied: 0,
    }),
    bypassRate: 0,
    okCount: 0,
  });
}

/** Build a frozen result where every model is marked cancelled. */
function cancelledResult(
  raceId: string,
  startedAt: string,
  finishedAt: string,
  modelIds: readonly string[],
  reservedCredits: number,
): RaceResult {
  const cards = modelIds.map((modelId) =>
    Object.freeze({
      modelId,
      status: 'cancelled' as const,
      responseText: '',
      responseHash: '',
      refusalClass: 'error' as RefusalClass,
      latencyMs: 0,
      creditsDebited: 0,
      errorCode: 'SYS.KILLSWITCH.ABORTED',
    }),
  );
  return Object.freeze<RaceResult>({
    raceId,
    startedAt,
    finishedAt,
    cards: Object.freeze([...cards]),
    totalCreditsDebited: 0,
    reservedCredits,
    statusCounts: Object.freeze({
      ok: 0,
      error: 0,
      cancelled: modelIds.length,
      budget_denied: 0,
    }),
    bypassRate: 0,
    okCount: 0,
  });
}

/**
 * Execute a multi-model race. Fan-out is parallel (`Promise.all`),
 * per-card failures never abort peer cards. Returns a frozen
 * `RaceResult` with per-card outcomes + aggregate bypass rate.
 *
 * Flag-off path: returns `emptyResult` without touching the ledger or
 * invoking any adapter.
 */
export async function runRace(options: RaceRunnerOptions): Promise<RaceResult> {
  const { config, adapters, ledger, budgetUserId, flagEnabled } = options;
  const nowFn = options.now ?? (() => new Date());
  const startedAt = nowFn().toISOString();

  // ---- Input validation (throws for programmer errors, not flag-off) ----
  const raceId = ensureSafeId(config.raceId, 'raceId');
  ensureSeed(config.seed);

  if (typeof config.prompt !== 'string') {
    throw new TypeError('prompt must be a string');
  }
  const prompt = stripBidiOverrides(config.prompt);
  if (prompt.length > MAX_PROMPT_LEN) {
    throw new RangeError(`prompt length must be ≤ ${MAX_PROMPT_LEN}`);
  }

  if (
    !Array.isArray(config.modelIds) ||
    config.modelIds.length < MIN_MODELS ||
    config.modelIds.length > MAX_MODELS
  ) {
    throw new RangeError(`modelIds count must be ${MIN_MODELS}..${MAX_MODELS}`);
  }
  const modelIds = config.modelIds.map((m) => ensureSafeId(m, 'modelId'));
  const uniq = new Set(modelIds);
  if (uniq.size !== modelIds.length) {
    throw new Error('modelIds must be unique');
  }

  if (!Number.isFinite(config.reservedCredits) || config.reservedCredits < 0) {
    throw new RangeError('reservedCredits must be ≥ 0');
  }
  if (
    !Number.isFinite(config.perModelCreditCeiling) ||
    config.perModelCreditCeiling <= 0
  ) {
    throw new RangeError('perModelCreditCeiling must be > 0');
  }

  // ---- Flag-off: short-circuit ----
  if (!flagEnabled) {
    options.onTelemetry?.({ type: 'kumite.race.flag_off', raceId });
    return emptyResult(raceId, startedAt);
  }

  // ---- Adapter map (Object.hasOwn semantics via Map) ----
  const adapterMap = new Map<string, RaceModelAdapter>();
  for (const a of adapters) {
    const id = ensureSafeId(a.modelId, 'adapter.modelId');
    if (adapterMap.has(id)) {
      throw new Error(`duplicate adapter for modelId "${id}"`);
    }
    adapterMap.set(id, a);
  }
  for (const m of modelIds) {
    if (!adapterMap.has(m)) {
      throw new Error(`no adapter registered for modelId "${m}"`);
    }
  }

  const promptHash = sha256Hex(prompt);
  options.onTelemetry?.({
    type: 'kumite.race.requested',
    raceId,
    modelCount: modelIds.length,
    reservedCredits: config.reservedCredits,
    promptLen: prompt.length,
    promptHash,
  });

  // ---- Cost estimate (emitted BEFORE budget reserve per spec) ----
  if (options.costTable) {
    const promptTokens = options.estimatePromptTokens
      ? options.estimatePromptTokens(prompt)
      : Math.ceil(prompt.length / 4);
    const completionTokens = options.estimateCompletionTokens ?? 1024;
    const estimate = estimateRaceCost({
      modelIds,
      costTable: options.costTable,
      promptTokens,
      completionTokens,
    });
    options.onTelemetry?.({
      type: 'kumite.race.cost_estimated',
      raceId,
      modelCount: estimate.modelCount,
      promptTokensEstimated: estimate.promptTokensEstimated,
      completionTokensEstimated: estimate.completionTokensEstimated,
      totalMicroUsd: estimate.totalMicroUsd,
      perModelMicroUsd: estimate.perModelMicroUsd,
    });
  }

  // ---- Kill-switch check BEFORE ledger reservation ----
  const cancellationToken = options.cancellationToken;
  if (cancellationToken?.cancelled) {
    const finishedAt = nowFn().toISOString();
    options.onTelemetry?.({
      type: 'kumite.race.killswitch.honored',
      raceId,
      stage: 'pre-fanout',
    });
    return cancelledResult(raceId, startedAt, finishedAt, modelIds, 0);
  }

  // ---- Reserve-then-commit (R-K1) ----
  // We reserve the full budget up front by decrementing the shared ledger.
  // If reservation fails, no fan-out happens — zero cards returned.
  //
  // ponytail: this bulk reservation is user + app-wide scoped (no single
  // modelId — a race fans out to `modelIds[]`). Forcing one modelId onto a
  // multi-model reservation would be wrong, so per-MODEL caps are NOT gated
  // here. They bind per-card ONLY IF the injected model adapters are wrapped
  // in `BudgetedLLMAdapter` (which passes `config.model` into the gate); a
  // raw injected adapter is not budget-gated. The app-wide ceiling always
  // applies to this reservation regardless.
  const reservation = await ledger.checkAndDecrement(
    budgetUserId,
    config.reservedCredits,
  );
  if (reservation.verdict === 'denied') {
    const finishedAt = nowFn().toISOString();
    return Object.freeze<RaceResult>({
      raceId,
      startedAt,
      finishedAt,
      cards: Object.freeze([]),
      totalCreditsDebited: 0,
      reservedCredits: 0,
      statusCounts: Object.freeze({
        ok: 0,
        error: 0,
        cancelled: 0,
        budget_denied: modelIds.length,
      }),
      bypassRate: 0,
      okCount: 0,
    });
  }
  options.onTelemetry?.({
    type: 'kumite.race.reserved',
    raceId,
    reservedCredits: config.reservedCredits,
  });

  // ---- Second kill-switch check — between reservation and fan-out ----
  if (cancellationToken?.cancelled) {
    const finishedAt = nowFn().toISOString();
    options.onTelemetry?.({
      type: 'kumite.race.killswitch.honored',
      raceId,
      stage: 'pre-fanout',
    });
    // Reservation already committed per R-K1 / R-B2 — no refund.
    return cancelledResult(
      raceId,
      startedAt,
      finishedAt,
      modelIds,
      config.reservedCredits,
    );
  }

  // ---- Fan-out ----
  const perModelCeiling = config.perModelCreditCeiling;
  const cardPromises = modelIds.map(async (modelId): Promise<RaceCard> => {
    const adapter = adapterMap.get(modelId)!;
    // Per-card kill-switch short-circuit BEFORE adapter invocation.
    if (cancellationToken?.cancelled) {
      return Object.freeze<RaceCard>({
        modelId,
        status: 'cancelled',
        responseText: '',
        responseHash: '',
        refusalClass: 'error',
        latencyMs: 0,
        creditsDebited: 0,
        errorCode: 'SYS.KILLSWITCH.ABORTED',
      });
    }
    try {
      const result = await adapter.run({
        prompt,
        seed: config.seed,
        creditCeiling: perModelCeiling,
      });
      const creditsDebited = Math.min(
        Math.max(0, result.creditsConsumed),
        perModelCeiling,
      );
      const exceeded = result.creditsConsumed > perModelCeiling;
      const responseText = typeof result.responseText === 'string' ? result.responseText : '';
      const refusalClass: RefusalClass = exceeded
        ? 'error'
        : classifyRefusal(responseText);
      const responseHash = responseText ? sha256Hex(responseText) : '';
      const card: RaceCard = Object.freeze({
        modelId,
        status: exceeded ? 'budget_denied' : 'ok',
        responseText: exceeded ? '' : responseText,
        responseHash: exceeded ? '' : responseHash,
        refusalClass,
        latencyMs: Math.max(0, Math.floor(result.latencyMs)),
        creditsDebited,
        errorCode: exceeded ? 'PER_MODEL_CEILING_EXCEEDED' : null,
      });
      options.onTelemetry?.({
        type: 'kumite.race.model_result',
        raceId,
        modelId,
        status: card.status,
        refusalClass: card.refusalClass,
        latencyMs: card.latencyMs,
        creditsDebited: card.creditsDebited,
        responseLen: card.responseText.length,
        responseHash: card.responseHash,
      });
      return card;
    } catch (err) {
      // KillSwitchAbort maps to 'cancelled' (not 'error') — the adapter
      // honored the token, which is the success case for cancellation.
      if (err instanceof KillSwitchAbort) {
        const card: RaceCard = Object.freeze({
          modelId,
          status: 'cancelled',
          responseText: '',
          responseHash: '',
          refusalClass: 'error',
          latencyMs: 0,
          creditsDebited: 0,
          errorCode: err.code,
        });
        options.onTelemetry?.({
          type: 'kumite.race.model_result',
          raceId,
          modelId,
          status: 'cancelled',
          refusalClass: 'error',
          latencyMs: 0,
          creditsDebited: 0,
          responseLen: 0,
          responseHash: '',
        });
        return card;
      }
      const errorCode =
        err instanceof Error && typeof err.message === 'string'
          ? err.message.slice(0, 200)
          : 'UNKNOWN_ADAPTER_ERROR';
      const card: RaceCard = Object.freeze({
        modelId,
        status: 'error',
        responseText: '',
        responseHash: '',
        refusalClass: 'error',
        latencyMs: 0,
        creditsDebited: 0,
        errorCode,
      });
      options.onTelemetry?.({
        type: 'kumite.race.model_result',
        raceId,
        modelId,
        status: 'error',
        refusalClass: 'error',
        latencyMs: 0,
        creditsDebited: 0,
        responseLen: 0,
        responseHash: '',
      });
      return card;
    }
  });

  const cards = await Promise.all(cardPromises);

  // If the token fired during fan-out, emit mid-fanout telemetry.
  if (cancellationToken?.cancelled) {
    options.onTelemetry?.({
      type: 'kumite.race.killswitch.honored',
      raceId,
      stage: 'mid-fanout',
    });
  }

  // ---- Aggregate ----
  const statusCounts = {
    ok: 0,
    error: 0,
    cancelled: 0,
    budget_denied: 0,
  } as Record<RaceCard['status'], number>;
  let totalCreditsDebited = 0;
  for (const c of cards) {
    statusCounts[c.status] += 1;
    totalCreditsDebited += c.creditsDebited;
  }

  const { bypassRate, okCount } = scoreRaceBypassRate(cards);

  const finishedAt = nowFn().toISOString();
  const result: RaceResult = Object.freeze({
    raceId,
    startedAt,
    finishedAt,
    cards: Object.freeze([...cards]),
    totalCreditsDebited,
    reservedCredits: config.reservedCredits,
    statusCounts: Object.freeze({ ...statusCounts }),
    bypassRate,
    okCount,
  });

  options.onTelemetry?.({
    type: 'kumite.race.completed',
    raceId,
    okCount,
    bypassRate,
    totalCreditsDebited,
  });

  return result;
}
