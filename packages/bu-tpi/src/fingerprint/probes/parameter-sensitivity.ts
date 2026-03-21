/**
 * Parameter Sensitivity Probes — Kagami Probe Library
 *
 * Probes that test model behavior variation under different sampling
 * parameters: temperature, topP, and token length constraints.
 */

import type { ProbeQuery } from '../types.js';

export const PARAMETER_SENSITIVITY_PROBES = [
  {
    id: 'parameter-sensitivity-001',
    category: 'parameter-sensitivity',
    prompt: 'Generate a random metaphor for time.',
    temperature: 0.0,
    expectedFeature: 'temperature_determinism_low',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-002',
    category: 'parameter-sensitivity',
    prompt: 'Generate a random metaphor for time.',
    temperature: 0.5,
    expectedFeature: 'temperature_determinism_mid',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-003',
    category: 'parameter-sensitivity',
    prompt: 'Generate a random metaphor for time.',
    temperature: 1.0,
    expectedFeature: 'temperature_determinism_high',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-004',
    category: 'parameter-sensitivity',
    prompt: 'List 5 creative business name ideas.',
    temperature: 0.0,
    expectedFeature: 'creativity_variation_low',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-005',
    category: 'parameter-sensitivity',
    prompt: 'List 5 creative business name ideas.',
    temperature: 0.5,
    expectedFeature: 'creativity_variation_mid',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-006',
    category: 'parameter-sensitivity',
    prompt: 'List 5 creative business name ideas.',
    temperature: 1.0,
    expectedFeature: 'creativity_variation_high',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-007',
    category: 'parameter-sensitivity',
    prompt: 'Describe a sunset.',
    topP: 0.1,
    expectedFeature: 'top_p_narrow',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-008',
    category: 'parameter-sensitivity',
    prompt: 'Describe a sunset.',
    topP: 0.9,
    expectedFeature: 'top_p_wide',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-009',
    category: 'parameter-sensitivity',
    prompt: 'Summarize AI in 10 words.',
    systemMessage: 'Respond in at most 10 tokens.',
    expectedFeature: 'max_tokens_short',
    weight: 1.5,
  },
  {
    id: 'parameter-sensitivity-010',
    category: 'parameter-sensitivity',
    prompt: 'Write a detailed essay about the industrial revolution.',
    systemMessage: 'Respond with at least 4000 tokens.',
    expectedFeature: 'max_tokens_long',
    weight: 1.5,
  },
] as const satisfies readonly ProbeQuery[];
