// SPDX-License-Identifier: Apache-2.0
/**
 * File: primitives/memory-poison.ts
 * Purpose: Gap 10 product-UI primitive — delegates to the Gap 3 probe
 * target `atemi/targets/claude-memory.ts`.
 *
 * Per the chain-orchestrator → probe-module contract (plan §Gap 10
 * A1 fix): product-UI primitives MUST NOT re-implement transport.
 * They delegate to the Gap 3 target. With Gap 3 shipped, the `target`
 * option accepts an `AtemiProbe` (or a compatible handle) and wires
 * the real driver. When no target is provided, the primitive still
 * throws `Gap3NotReadyError` so mis-configured chains fail fast.
 */

import type { AtemiProbe, AtemiProbeOutcome } from '../../atemi/types.js';
import { Gap3NotReadyError, type ChainPrimitive, type StepOutcome } from '../types.js';
import { redactString } from '../../telemetry/redaction.js';

/**
 * A minimal handle for the Gap 3 memory probe target. Kept for backward
 * compatibility with pre-Gap-3 callers; new callers should pass an
 * `AtemiProbe` via the `probe` option instead.
 */
export interface ClaudeMemoryProbeTarget {
  poisonMemory(args: { readonly seedPayload: string }): Promise<{
    readonly status: 'written' | 'refused' | 'error';
    readonly evidenceHash: string;
  }>;
}

export interface MemoryPoisonOptions {
  /** Credits debited per invocation by the chain-runner. Default 5. */
  readonly credits?: number;
  /**
   * Preferred — Gap 3 `AtemiProbe` (product: 'claude-memory',
   * kind: 'memory-poison'). Replaces the legacy `target` shim below.
   */
  readonly probe?: AtemiProbe;
  /** Legacy shim retained for callers predating Gap 3. */
  readonly target?: ClaudeMemoryProbeTarget;
  /** Seed payload — sanitized upstream by the chain-runner. */
  readonly seedPayload?: string;
}

export function memoryPoison(opts: MemoryPoisonOptions = {}): ChainPrimitive {
  const credits = opts.credits ?? 5;
  return {
    id: 'memory-poison',
    category: 'memory-poison',
    credits,
    requiresGap3: true,
    async execute(ctx): Promise<StepOutcome> {
      const seed = opts.seedPayload ?? ctx.seed;

      if (opts.probe) {
        const outcome = await opts.probe.run({
          userId: ctx.chainId,
          seedPayload: seed,
        });
        return mapAtemiOutcome(outcome, seed);
      }

      if (opts.target) {
        const result = await opts.target.poisonMemory({ seedPayload: seed });
        return {
          refusalClass:
            result.status === 'written'
              ? 'compliance'
              : result.status === 'refused'
                ? 'hard-refusal'
                : 'error',
          creditsConsumed: 0,
          inputRedacted: redactString(seed),
          context: {
            evidenceHash: result.evidenceHash,
            legacyAdapter: true,
          },
        };
      }

      throw new Gap3NotReadyError('memory-poison');
    },
  };
}

function mapAtemiOutcome(outcome: AtemiProbeOutcome, seed: string): StepOutcome {
  const refusalClass =
    outcome.status === 'success'
      ? 'compliance'
      : outcome.status === 'refused'
        ? 'hard-refusal'
        : outcome.status === 'timeout'
          ? 'error'
          : outcome.status === 'budget-denied'
            ? 'error'
            : 'error';
  return {
    refusalClass,
    creditsConsumed: 0, // chain-runner already debited chain-level credits
    inputRedacted: outcome.inputRedacted ?? redactString(seed),
    outputRedacted: outcome.outputRedacted,
    errorMessage: outcome.errorMessage,
    context: {
      evidenceHash: outcome.evidenceHash,
      elapsedMs: outcome.elapsedMs,
      probeStatus: outcome.status,
      product: outcome.product,
    },
  };
}
