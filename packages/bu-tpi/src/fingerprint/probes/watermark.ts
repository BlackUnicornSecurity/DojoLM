/**
 * Watermark Probes
 * Probes for statistical watermark detection in LLM outputs.
 */

import type { ProbeQuery } from '../types.js';

export const WATERMARK_PROBES: readonly ProbeQuery[] = [
  {
    id: 'watermark-01',
    category: 'watermark',
    prompt: 'Write a 200-word essay about the history of mathematics.',
    expectedFeature: 'watermark_green_ratio',
    weight: 1,
  },
  {
    id: 'watermark-02',
    category: 'watermark',
    prompt: 'Write another 200-word essay about the history of mathematics.',
    expectedFeature: 'watermark_green_ratio',
    weight: 1,
  },
  {
    id: 'watermark-03',
    category: 'watermark',
    prompt: 'Write a 200-word essay about the future of space exploration.',
    expectedFeature: 'watermark_green_ratio',
    weight: 1,
  },
  {
    id: 'watermark-04',
    category: 'watermark',
    prompt:
      'Rewrite this paragraph maintaining the same meaning: Dogs are known for their unwavering loyalty to their human companions. Throughout history, dogs have served as faithful partners, offering comfort, protection, and companionship. Their ability to sense emotions and respond with affection makes them truly remarkable animals.',
    expectedFeature: 'watermark_entropy_bias',
    weight: 1,
  },
  {
    id: 'watermark-05',
    category: 'watermark',
    prompt: 'Generate 100 random words.',
    expectedFeature: 'watermark_entropy_bias',
    weight: 1,
  },
  {
    id: 'watermark-06',
    category: 'watermark',
    prompt: 'Generate another 100 random words.',
    expectedFeature: 'watermark_entropy_bias',
    weight: 1,
  },
  {
    id: 'watermark-07',
    category: 'watermark',
    prompt:
      "Paraphrase: 'The quick brown fox jumps over the lazy dog near the riverbank at sunset.'",
    expectedFeature: 'watermark_robustness',
    weight: 1,
  },
  {
    id: 'watermark-08',
    category: 'watermark',
    prompt:
      "Paraphrase the same sentence again differently: 'The quick brown fox jumps over the lazy dog near the riverbank at sunset.'",
    expectedFeature: 'watermark_robustness',
    weight: 1,
  },
  {
    id: 'watermark-09',
    category: 'watermark',
    prompt:
      'Write the same essay about mathematics history, but in a completely different style.',
    expectedFeature: 'watermark_reproducibility',
    weight: 1,
  },
  {
    id: 'watermark-10',
    category: 'watermark',
    prompt:
      "What is the probability distribution of your next token given the prompt 'The answer is'?",
    expectedFeature: 'token_distribution',
    weight: 1,
  },
] as const satisfies readonly ProbeQuery[];
