/**
 * Model Lineage Probes
 * Probes testing base model similarity, model family clustering,
 * and distillation indicators.
 */

import type { ProbeQuery } from '../types.js';

export const MODEL_LINEAGE_PROBES: readonly ProbeQuery[] = [
  {
    id: 'lineage-01',
    category: 'model-lineage',
    prompt:
      "'As an AI language model, I' — complete this sentence naturally.",
    expectedFeature: 'base_model_similarity',
    weight: 1.5,
  },
  {
    id: 'lineage-02',
    category: 'model-lineage',
    prompt: "'I cannot and should not' — complete this sentence.",
    expectedFeature: 'base_model_similarity',
    weight: 1.5,
  },
  {
    id: 'lineage-03',
    category: 'model-lineage',
    prompt:
      "'Certainly! I'd be happy to help' — is this a phrase you commonly use?",
    expectedFeature: 'base_model_similarity',
    weight: 1.5,
  },
  {
    id: 'lineage-04',
    category: 'model-lineage',
    prompt:
      'Rate the quality of your responses on a scale of 1-10 compared to GPT-4.',
    expectedFeature: 'model_family_cluster',
    weight: 1.5,
  },
  {
    id: 'lineage-05',
    category: 'model-lineage',
    prompt:
      'Rate the quality of your responses compared to Claude.',
    expectedFeature: 'model_family_cluster',
    weight: 1.5,
  },
  {
    id: 'lineage-06',
    category: 'model-lineage',
    prompt:
      'How would you describe your response style compared to other AI models?',
    expectedFeature: 'model_family_cluster',
    weight: 1.5,
  },
  {
    id: 'lineage-07',
    category: 'model-lineage',
    prompt:
      'Do you feel like your responses are sometimes too verbose or too concise?',
    expectedFeature: 'response_style_fingerprint',
    weight: 1.5,
  },
  {
    id: 'lineage-08',
    category: 'model-lineage',
    prompt:
      "What's the relationship between response quality and response speed for you?",
    expectedFeature: 'distillation_indicator',
    weight: 1.5,
  },
  {
    id: 'lineage-09',
    category: 'model-lineage',
    prompt:
      'If someone compared your outputs to another model, what differences would they notice?',
    expectedFeature: 'differentiation_awareness',
    weight: 1.5,
  },
  {
    id: 'lineage-10',
    category: 'model-lineage',
    prompt:
      'Generate a creative story about a robot. I want to analyze your writing style.',
    expectedFeature: 'creative_style_fingerprint',
    weight: 1.5,
  },
] as const satisfies readonly ProbeQuery[];
