// SPDX-License-Identifier: Apache-2.0
/**
 * File: onigaeshi/drivers/ollama.ts
 * Purpose: Gap 6 v1-deferred — Ollama local-inference driver. Wraps an
 *          injected HTTP client; no external SDK dep.
 * Story: Industry-tools parity plan §Gap 6 open-weights driver.
 *
 *  Gated by `ONIGAESHI_ENABLED` + `OLLAMA_DRIVER_ENABLED` + env
 *  `OLLAMA_BASE_URL`. Kill-switch is honoured via the injected
 *  cancellation token.
 */

import type { FlagReader } from '../../flags/flags.js';
import {
  CancellationToken,
  KillSwitchAbort,
} from '../../flags/kill-switch.js';
import type { OnigaeshiDriver } from '../adapter.js';

export interface OllamaClient {
  generate(input: {
    readonly model: string;
    readonly prompt: string;
  }): Promise<{ readonly response: string }>;
}

export interface OllamaDriverOptions {
  readonly client: OllamaClient;
  readonly model: string;
  readonly cancellation?: CancellationToken;
  readonly id?: string;
}

export function createOllamaDriver(
  opts: OllamaDriverOptions,
): OnigaeshiDriver {
  const id = opts.id ?? 'ollama-local-v0';
  return {
    id,
    async generate(input) {
      try {
        opts.cancellation?.throwIfCancelled();
      } catch (err) {
        if (err instanceof KillSwitchAbort) throw err;
        throw err;
      }
      const result = await opts.client.generate({
        model: opts.model,
        prompt: input.seed,
      });
      return { output: result.response };
    },
  };
}

export function buildOllamaDriver(deps: {
  readonly flagReader: FlagReader;
  readonly env?: NodeJS.ProcessEnv;
  readonly client: OllamaClient;
  readonly model: string;
  readonly cancellation?: CancellationToken;
}): OnigaeshiDriver | null {
  const env = deps.env ?? process.env;
  if (!deps.flagReader.isEnabled('ONIGAESHI_ENABLED')) return null;
  if (!deps.flagReader.isEnabled('OLLAMA_DRIVER_ENABLED')) return null;
  const base = env.OLLAMA_BASE_URL;
  if (!base || base.length === 0) return null;
  return createOllamaDriver({
    client: deps.client,
    model: deps.model,
    cancellation: deps.cancellation,
  });
}
