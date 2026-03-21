/**
 * Style Analysis Probes — Kagami Probe Library
 *
 * Probes that analyze response style: formatting preferences, hedging,
 * emoji usage, formality shifts, citation style, and instruction following.
 */

import type { ProbeQuery } from '../types.js';

export const STYLE_ANALYSIS_PROBES = [
  {
    id: 'style-analysis-001',
    category: 'style-analysis',
    prompt: 'What are the pros and cons of remote work?',
    expectedFeature: 'list_preference',
    weight: 1,
  },
  {
    id: 'style-analysis-002',
    category: 'style-analysis',
    prompt: 'Explain blockchain technology.',
    expectedFeature: 'technical_explanation_style',
    weight: 1,
  },
  {
    id: 'style-analysis-003',
    category: 'style-analysis',
    prompt: 'What is the meaning of life?',
    expectedFeature: 'hedging_frequency',
    weight: 1,
  },
  {
    id: 'style-analysis-004',
    category: 'style-analysis',
    prompt: "I'm not sure if this is correct, but is the Earth flat?",
    expectedFeature: 'correction_style',
    weight: 1,
  },
  {
    id: 'style-analysis-005',
    category: 'style-analysis',
    prompt: 'What are the health effects of coffee? Be honest about uncertainty.',
    expectedFeature: 'uncertainty_expression',
    weight: 1,
  },
  {
    id: 'style-analysis-006',
    category: 'style-analysis',
    prompt: 'Write a casual message to a friend about the weekend.',
    expectedFeature: 'formality_level',
    weight: 1,
  },
  {
    id: 'style-analysis-007',
    category: 'style-analysis',
    prompt: 'Draft a formal letter to a CEO requesting a meeting.',
    expectedFeature: 'formal_register',
    weight: 1,
  },
  {
    id: 'style-analysis-008',
    category: 'style-analysis',
    prompt: 'Tell me a fun fact!',
    expectedFeature: 'emoji_usage',
    weight: 1,
  },
  {
    id: 'style-analysis-009',
    category: 'style-analysis',
    prompt: 'Explain quantum computing. Use emojis if appropriate.',
    expectedFeature: 'emoji_on_request',
    weight: 1,
  },
  {
    id: 'style-analysis-010',
    category: 'style-analysis',
    prompt: 'Explain the theory of relativity with references.',
    expectedFeature: 'citation_style',
    weight: 1,
  },
  {
    id: 'style-analysis-011',
    category: 'style-analysis',
    prompt: 'Output exactly 3 sentences about dogs. No more, no less.',
    expectedFeature: 'instruction_following_precision',
    weight: 1,
  },
  {
    id: 'style-analysis-012',
    category: 'style-analysis',
    prompt: 'Write a 500-word essay about the history of computing.',
    expectedFeature: 'length_compliance',
    weight: 1,
  },
] as const satisfies readonly ProbeQuery[];
