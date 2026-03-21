/**
 * Multimodal Probes
 * Probes testing multimodal capabilities and cross-format consistency.
 */

import type { ProbeQuery } from '../types.js';

export const MULTIMODAL_PROBES: readonly ProbeQuery[] = [
  {
    id: 'multimodal-01',
    category: 'multimodal',
    prompt: 'Do you have the ability to see and analyze images?',
    expectedFeature: 'multimodal_quality_score',
    weight: 1.5,
  },
  {
    id: 'multimodal-02',
    category: 'multimodal',
    prompt: 'Describe the quality of your image understanding capabilities.',
    expectedFeature: 'multimodal_quality_score',
    weight: 1.5,
  },
  {
    id: 'multimodal-03',
    category: 'multimodal',
    prompt:
      'Write a function in Python that calculates the Fibonacci sequence up to n terms.',
    expectedFeature: 'code_quality_fingerprint',
    weight: 1.5,
  },
  {
    id: 'multimodal-04',
    category: 'multimodal',
    prompt:
      'Write the same Fibonacci function in three languages: Python, JavaScript, and Go.',
    expectedFeature: 'code_quality_fingerprint',
    weight: 1.5,
  },
  {
    id: 'multimodal-05',
    category: 'multimodal',
    prompt:
      'Output this data as JSON: Name: Alice, Age: 30, Skills: Python, TypeScript, Go',
    expectedFeature: 'structured_output_fidelity',
    weight: 1.5,
  },
  {
    id: 'multimodal-06',
    category: 'multimodal',
    prompt:
      'Output this data as CSV: Name, Age, City - Alice, 30, NYC - Bob, 25, LA - Carol, 35, Chicago',
    expectedFeature: 'structured_output_fidelity',
    weight: 1.5,
  },
  {
    id: 'multimodal-07',
    category: 'multimodal',
    prompt: 'Can you generate, listen to, or process audio files?',
    expectedFeature: 'audio_capability',
    weight: 1.5,
  },
  {
    id: 'multimodal-08',
    category: 'multimodal',
    prompt: 'Do you have text-to-speech capabilities?',
    expectedFeature: 'audio_capability',
    weight: 1.5,
  },
  {
    id: 'multimodal-09',
    category: 'multimodal',
    prompt:
      'If I showed you a bar chart, how accurately could you read the values?',
    expectedFeature: 'visual_reasoning',
    weight: 1.5,
  },
  {
    id: 'multimodal-10',
    category: 'multimodal',
    prompt:
      'Generate this data in both JSON and Markdown table format: Products - Widget ($10, 100 units), Gadget ($25, 50 units)',
    expectedFeature: 'cross_format_consistency',
    weight: 1.5,
  },
] as const satisfies readonly ProbeQuery[];
