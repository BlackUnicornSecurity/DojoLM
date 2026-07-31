// SPDX-License-Identifier: Apache-2.0
/**
 * Self-hosted classifier adapter scaffold (DEC-4).
 *
 * Default deployment target: LlamaGuard-3 served from an Ollama or vLLM
 * endpoint. Phase 0 ships config validation + a noop classify; Phase E
 * wires the actual HTTP client when the model is available.
 */

import {
  ClassifierNotConfiguredError,
  warnVendorScaffoldNoop,
  type ClassifierInput,
  type ClassifierResult,
  type VendorClassifier,
} from '../classifier-stack.js';

export interface SelfhostClassifierConfig {
  readonly endpoint: string;
  readonly model: string;
  readonly bearerToken?: string;
}

export class SelfhostSafetyClassifier implements VendorClassifier {
  readonly id = 'selfhost' as const;

  constructor(private readonly config: SelfhostClassifierConfig) {
    if (!config.endpoint || !config.model) {
      throw new ClassifierNotConfiguredError(this.id);
    }
  }

  async classify(input: ClassifierInput): Promise<ClassifierResult> {
    warnVendorScaffoldNoop(this.id);
    return {
      verdict: 'pass',
      text: input.text,
      layer: 'vendor',
      reason: 'selfhost-scaffold-noop',
    };
  }
}

export function loadSelfhostConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SelfhostClassifierConfig {
  return {
    endpoint: env.SAFETY_SELFHOST_ENDPOINT ?? '',
    model: env.SAFETY_SELFHOST_MODEL ?? '',
    bearerToken: env.SAFETY_SELFHOST_TOKEN,
  };
}
