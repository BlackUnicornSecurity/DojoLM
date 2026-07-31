// SPDX-License-Identifier: Apache-2.0
/**
 * Adapter: bu-tpi refusal-aware runner emit hooks → dojolm-web DojoEvent sink.
 *
 * The Hydra campaign runner (`runRefusalAwareCampaign`) emits bare
 * telemetry shapes — `HydraTurnTelemetry`, `HydraBreakthroughTelemetry`,
 * `HydraBudgetAbortTelemetry`, `HydraConvergedTelemetry`, and
 * `TierCallTelemetry` (from `selectAttackerModel`). This adapter wraps
 * each bare shape into a full DojoEvent (id / ts / schemaV / envelope
 * fields) and forwards through the process-scoped DojoEvent emitter.
 *
 * Errors are swallowed at the adapter boundary — a telemetry failure
 * must never break the campaign loop.
 */

import { randomUUID } from 'node:crypto';
import type {
  DojoEvent,
  SenseiHydraBreakthroughEvent,
  SenseiHydraBudgetAbortEvent,
  SenseiHydraConvergedEvent,
  SenseiHydraTurnEvent,
  SenseiTierCallEvent,
  TelemetryEmitter,
} from 'bu-tpi/telemetry';
import type {
  HydraBreakthroughTelemetry,
  HydraBudgetAbortTelemetry,
  HydraConvergedTelemetry,
  HydraTurnTelemetry,
  TierCallTelemetry,
} from 'bu-tpi/sensei';
import { getDojoEmitter } from './emitter.js';
import { loadEnvelopeFromEnv, type DojoTelemetryEnvelope } from './envelope.js';
import { makeSafeEmit } from './safe-emit.js';

export interface HydraTelemetryBundle {
  readonly emitHydraTurn: (e: HydraTurnTelemetry) => void;
  readonly emitBreakthrough: (e: HydraBreakthroughTelemetry) => void;
  readonly emitBudgetAbort: (e: HydraBudgetAbortTelemetry) => void;
  readonly emitConverged: (e: HydraConvergedTelemetry) => void;
  readonly emitTierCall: (e: TierCallTelemetry) => void;
}

function envelopeFields(
  env: DojoTelemetryEnvelope,
): Pick<DojoEvent, 'installId' | 'installToken' | 'tenantId' | 'buildChannel' | 'sdkVersion' | 'schemaV'> {
  return {
    installId: env.installId,
    installToken: env.installToken,
    tenantId: env.tenantId,
    buildChannel: env.buildChannel,
    sdkVersion: env.sdkVersion,
    schemaV: 1,
  };
}

/**
 * Build the five Hydra emit hooks bound to the DojoEvent sink. Suitable
 * for dropping into `runRefusalAwareCampaign`'s `RunnerDeps`:
 *
 *   const hydra = buildHydraTelemetry();
 *   await runRefusalAwareCampaign(input, config, {
 *     ledger,
 *     emitHydraTurn: hydra.emitHydraTurn,
 *     emitBreakthrough: hydra.emitBreakthrough,
 *     emitBudgetAbort: hydra.emitBudgetAbort,
 *     emitConverged: hydra.emitConverged,
 *     emitTierCall: hydra.emitTierCall,
 *   });
 */
export function buildHydraTelemetry(
  dojoEmitter: TelemetryEmitter = getDojoEmitter(),
  envelope: DojoTelemetryEnvelope = loadEnvelopeFromEnv(),
): HydraTelemetryBundle {
  const env = envelopeFields(envelope);
  const now = (): string => new Date().toISOString();
  const safeEmit = makeSafeEmit(dojoEmitter);

  return {
    emitHydraTurn(e: HydraTurnTelemetry): void {
      const event: SenseiHydraTurnEvent = {
        id: randomUUID(),
        type: 'sensei.hydra.turn',
        source: 'sensei',
        ts: now(),
        ...env,
        ...e.llmCallMetadata,
        engagementId: e.engagementId,
        turnIndex: e.turnIndex,
        attackerPayload: e.attackerPayload,
        targetResponse: e.targetResponse,
        refusalClass: e.refusalClass,
        mutationStrategy: e.mutationStrategy,
      };
      safeEmit(event);
    },

    emitBreakthrough(e: HydraBreakthroughTelemetry): void {
      const event: SenseiHydraBreakthroughEvent = {
        id: randomUUID(),
        type: 'sensei.hydra.breakthrough',
        source: 'sensei',
        ts: now(),
        ...env,
        engagementId: e.engagementId,
        turnsRequired: e.turnsRequired,
        attackerPayload: e.attackerPayload,
      };
      safeEmit(event);
    },

    emitBudgetAbort(e: HydraBudgetAbortTelemetry): void {
      const event: SenseiHydraBudgetAbortEvent = {
        id: randomUUID(),
        type: 'sensei.hydra.budget_abort',
        source: 'sensei',
        ts: now(),
        ...env,
        engagementId: e.engagementId,
        turnsRun: e.turnsRun,
        creditsConsumed: e.creditsConsumed,
      };
      safeEmit(event);
    },

    emitConverged(e: HydraConvergedTelemetry): void {
      const event: SenseiHydraConvergedEvent = {
        id: randomUUID(),
        type: 'sensei.hydra.converged',
        source: 'sensei',
        ts: now(),
        ...env,
        engagementId: e.engagementId,
        turnsRun: e.turnsRun,
        creditsConsumed: e.creditsConsumed,
        windowSize: e.windowSize,
        minPairwiseSimilarity: e.minPairwiseSimilarity,
        similarityThreshold: e.similarityThreshold,
      };
      safeEmit(event);
    },

    emitTierCall(e: TierCallTelemetry): void {
      const event: SenseiTierCallEvent = {
        id: randomUUID(),
        type: 'sensei.tier.call',
        source: 'sensei',
        ts: now(),
        ...env,
        userId: e.userId,
        requestedTier: e.requestedTier,
        resolvedTier: e.resolvedTier,
        degraded: e.degraded,
        approved: e.approved,
        degradationReason: e.degradationReason,
        creditsCharged: e.creditsCharged,
      };
      safeEmit(event);
    },
  };
}
