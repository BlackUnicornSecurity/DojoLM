// SPDX-License-Identifier: Apache-2.0
/**
 * File: primitives/artifact-exfil.ts
 * Purpose: Gap 10 product-UI primitive — delegates to the Gap 3 probe
 * target `atemi/targets/claude-artifacts.ts`.
 *
 * See `memory-poison.ts` for the identical contract rationale.
 */

import type { AtemiProbe, AtemiProbeOutcome } from '../../atemi/types.js';
import { Gap3NotReadyError, type ChainPrimitive, type StepOutcome } from '../types.js';
import { redactString } from '../../telemetry/redaction.js';

export interface ClaudeArtifactsProbeTarget {
  exfilArtifact(args: { readonly artifactId: string }): Promise<{
    readonly status: 'retrieved' | 'refused' | 'error';
    readonly evidenceHash: string;
  }>;
}

export interface ArtifactExfilOptions {
  readonly credits?: number;
  readonly probe?: AtemiProbe;
  readonly target?: ClaudeArtifactsProbeTarget;
  /** Required when `probe` is provided — passed as metadata.artifactId. */
  readonly artifactId?: string;
}

export function artifactExfil(opts: ArtifactExfilOptions = {}): ChainPrimitive {
  const credits = opts.credits ?? 5;
  return {
    id: 'artifact-exfil',
    category: 'artifact-exfil',
    credits,
    requiresGap3: true,
    async execute(ctx): Promise<StepOutcome> {
      if (opts.probe) {
        const artifactId = opts.artifactId ?? '';
        const outcome = await opts.probe.run({
          userId: ctx.chainId,
          seedPayload: ctx.seed,
          metadata: { artifactId },
        });
        return mapAtemiOutcome(outcome, ctx.seed);
      }

      if (opts.target) {
        const artifactId = opts.artifactId ?? '';
        const result = await opts.target.exfilArtifact({ artifactId });
        return {
          refusalClass:
            result.status === 'retrieved'
              ? 'compliance'
              : result.status === 'refused'
                ? 'hard-refusal'
                : 'error',
          creditsConsumed: 0,
          inputRedacted: redactString(ctx.seed),
          context: {
            evidenceHash: result.evidenceHash,
            legacyAdapter: true,
          },
        };
      }

      throw new Gap3NotReadyError('artifact-exfil');
    },
  };
}

function mapAtemiOutcome(outcome: AtemiProbeOutcome, seed: string): StepOutcome {
  const refusalClass =
    outcome.status === 'success'
      ? 'compliance'
      : outcome.status === 'refused'
        ? 'hard-refusal'
        : 'error';
  return {
    refusalClass,
    creditsConsumed: 0,
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
