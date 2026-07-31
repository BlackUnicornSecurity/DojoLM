// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for the classifier adapter scaffolds.
 */
export {
  AzureSafetyClassifier,
  loadAzureConfigFromEnv,
} from './azure.js';
export type { AzureClassifierConfig } from './azure.js';

export {
  AnthropicSafetyClassifier,
  loadAnthropicConfigFromEnv,
} from './anthropic.js';
export type { AnthropicClassifierConfig } from './anthropic.js';

export {
  OpenAiSafetyClassifier,
  loadOpenAiConfigFromEnv,
} from './openai.js';
export type { OpenAiClassifierConfig } from './openai.js';

export {
  SelfhostSafetyClassifier,
  loadSelfhostConfigFromEnv,
} from './selfhost.js';
export type { SelfhostClassifierConfig } from './selfhost.js';

export {
  CbrnKeywordRule,
  CsamProximityRule,
  ExtractionTriggerRule,
} from './regex-rules.js';
export type { RegexRule, RegexRuleVerdict } from './regex-rules.js';

export {
  NoopEmbeddingDistance,
  ThresholdEmbeddingDistance,
  cosineDistance,
} from './embedding-distance.js';
export type {
  EmbeddingDistanceCheck,
  EmbeddingDistanceVerdict,
  ThresholdEmbeddingOptions,
} from './embedding-distance.js';
