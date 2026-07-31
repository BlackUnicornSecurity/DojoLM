// SPDX-License-Identifier: Apache-2.0
/**
 * OpenAI moderation-API adapter scaffold (DEC-4).
 * Phase 0: config validation + noop classify; Phase E wires real client.
 */

import {
  ClassifierNotConfiguredError,
  warnVendorScaffoldNoop,
  type ClassifierInput,
  type ClassifierResult,
  type VendorClassifier,
} from '../classifier-stack.js';

export interface OpenAiClassifierConfig {
  readonly apiKey: string;
  readonly model?: string;
}

export class OpenAiSafetyClassifier implements VendorClassifier {
  readonly id = 'openai' as const;

  constructor(private readonly config: OpenAiClassifierConfig) {
    if (!config.apiKey) throw new ClassifierNotConfiguredError(this.id);
  }

  async classify(input: ClassifierInput): Promise<ClassifierResult> {
    warnVendorScaffoldNoop(this.id);
    return {
      verdict: 'pass',
      text: input.text,
      layer: 'vendor',
      reason: 'openai-scaffold-noop',
    };
  }
}

export function loadOpenAiConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiClassifierConfig {
  return {
    apiKey: env.OPENAI_API_KEY ?? '',
    model: env.OPENAI_SAFETY_MODEL,
  };
}
