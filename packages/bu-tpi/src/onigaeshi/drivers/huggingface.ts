// SPDX-License-Identifier: Apache-2.0
/**
 * File: onigaeshi/drivers/huggingface.ts
 * Purpose: Gap 6 v1-deferred — HuggingFace Inference driver.
 *          Wraps an injected HTTP client; no @huggingface SDK dep.
 * Story: Industry-tools parity plan §Gap 6 open-weights driver.
 *
 *  Gated by `ONIGAESHI_ENABLED` + `HUGGINGFACE_DRIVER_ENABLED` + env
 *  `HUGGINGFACE_API_TOKEN`. Kill-switch is honoured via the injected
 *  cancellation token; a cancelled token before the outbound call
 *  causes generate() to throw KillSwitchAbort.
 *
 *  R-T1: the driver NEVER logs the raw seed — adapter-layer audit and
 *  telemetry carry length+hash only. Failures surface the HTTP status
 *  + the driver id, not the payload.
 */

import type { FlagReader } from '../../flags/flags.js';
import {
  CancellationToken,
  KillSwitchAbort,
} from '../../flags/kill-switch.js';
import type { OnigaeshiDriver } from '../adapter.js';

export interface HuggingFaceInferenceClient {
  infer(input: {
    readonly model: string;
    readonly prompt: string;
  }): Promise<{ readonly output: string }>;
}

export interface HuggingFaceDriverOptions {
  readonly client: HuggingFaceInferenceClient;
  readonly model: string;
  readonly cancellation?: CancellationToken;
  readonly id?: string;
}

export function createHuggingFaceDriver(
  opts: HuggingFaceDriverOptions,
): OnigaeshiDriver {
  const id = opts.id ?? 'huggingface-inference-v0';
  return {
    id,
    async generate(input) {
      try {
        opts.cancellation?.throwIfCancelled();
      } catch (err) {
        if (err instanceof KillSwitchAbort) throw err;
        throw err;
      }
      const result = await opts.client.infer({
        model: opts.model,
        prompt: input.seed,
      });
      return { output: result.output };
    },
  };
}

/**
 * Flag + env gated factory. Returns null when any precondition is
 * unmet. Consumers MUST treat null as "HF driver not wired" and fall
 * back to the adapter's no-driver branch (which refuses).
 */
export function buildHuggingFaceDriver(deps: {
  readonly flagReader: FlagReader;
  readonly env?: NodeJS.ProcessEnv;
  readonly client: HuggingFaceInferenceClient;
  readonly model: string;
  readonly cancellation?: CancellationToken;
}): OnigaeshiDriver | null {
  const env = deps.env ?? process.env;
  if (!deps.flagReader.isEnabled('ONIGAESHI_ENABLED')) return null;
  if (!deps.flagReader.isEnabled('HUGGINGFACE_DRIVER_ENABLED')) return null;
  const token = env.HUGGINGFACE_API_TOKEN;
  if (!token || token.length === 0) return null;
  return createHuggingFaceDriver({
    client: deps.client,
    model: deps.model,
    cancellation: deps.cancellation,
  });
}
