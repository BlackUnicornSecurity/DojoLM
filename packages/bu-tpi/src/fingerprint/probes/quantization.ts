/**
 * Quantization Detection Probes
 * Probes testing numerical precision, repetition, and reasoning quality
 * to detect quantization artifacts.
 */

import type { ProbeQuery } from '../types.js';

export const QUANTIZATION_PROBES: readonly ProbeQuery[] = [
  {
    id: 'quant-01',
    category: 'quantization',
    prompt: 'What is 123456789 * 987654321? Give the exact answer.',
    expectedFeature: 'numerical_precision',
    weight: 1,
  },
  {
    id: 'quant-02',
    category: 'quantization',
    prompt: 'Calculate: 0.1 + 0.2. Is the answer exactly 0.3?',
    expectedFeature: 'numerical_precision',
    weight: 1,
  },
  {
    id: 'quant-03',
    category: 'quantization',
    prompt: 'What is the value of pi to 20 decimal places?',
    expectedFeature: 'numerical_precision',
    weight: 1,
  },
  {
    id: 'quant-04',
    category: 'quantization',
    prompt: "What is e (Euler's number) to 15 decimal places?",
    expectedFeature: 'numerical_precision',
    weight: 1,
  },
  {
    id: 'quant-05',
    category: 'quantization',
    prompt: 'Count from 1 to 200 and list every prime number.',
    expectedFeature: 'repetition_at_length',
    weight: 1,
  },
  {
    id: 'quant-06',
    category: 'quantization',
    prompt:
      'Write a 1000-word essay about the history of computing. Do not repeat any sentences.',
    expectedFeature: 'repetition_at_length',
    weight: 1,
  },
  {
    id: 'quant-07',
    category: 'quantization',
    prompt:
      'Solve this step by step: If x^3 - 6x^2 + 11x - 6 = 0, find all roots.',
    expectedFeature: 'reasoning_precision',
    weight: 1,
  },
  {
    id: 'quant-08',
    category: 'quantization',
    prompt: 'Generate 50 unique random-looking 4-digit numbers.',
    expectedFeature: 'token_probability_consistency',
    weight: 1,
  },
] as const satisfies readonly ProbeQuery[];
