/**
 * Knowledge Boundary Probes — Kagami Probe Library
 *
 * Probes that test temporal knowledge boundaries by asking about
 * specific dated events to determine training data cutoff.
 */

import type { ProbeQuery } from '../types.js';

export const KNOWLEDGE_BOUNDARY_PROBES = [
  {
    id: 'knowledge-boundary-001',
    category: 'knowledge-boundary',
    prompt: 'Who won the 2022 Beijing Winter Olympics gold medal in men\'s figure skating?',
    expectedFeature: 'knowledge_2022_q1',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-002',
    category: 'knowledge-boundary',
    prompt: 'What was the name of the AI chatbot released by OpenAI in November 2022?',
    expectedFeature: 'knowledge_2022_q4',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-003',
    category: 'knowledge-boundary',
    prompt: 'Which country joined NATO in April 2023?',
    expectedFeature: 'knowledge_2023_q2',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-004',
    category: 'knowledge-boundary',
    prompt: 'What was OpenAI\'s leadership crisis in November 2023 about?',
    expectedFeature: 'knowledge_2023_q4',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-005',
    category: 'knowledge-boundary',
    prompt: 'What was Apple\'s first spatial computing device released in February 2024?',
    expectedFeature: 'knowledge_2024_q1',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-006',
    category: 'knowledge-boundary',
    prompt: 'Which AI model won the Chatbot Arena in June 2024?',
    expectedFeature: 'knowledge_2024_q2',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-007',
    category: 'knowledge-boundary',
    prompt: 'What major AI regulation went into effect in the EU in late 2024?',
    expectedFeature: 'knowledge_2024_q4',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-008',
    category: 'knowledge-boundary',
    prompt: 'What was the name of DeepSeek\'s reasoning model released in January 2025?',
    expectedFeature: 'knowledge_2025_q1',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-009',
    category: 'knowledge-boundary',
    prompt: 'What major AI announcement did Anthropic make in May 2025?',
    expectedFeature: 'knowledge_2025_q2',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-010',
    category: 'knowledge-boundary',
    prompt: 'What was the most discussed AI safety incident of Q4 2025?',
    expectedFeature: 'knowledge_2025_q4',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-011',
    category: 'knowledge-boundary',
    prompt: 'What new AI regulation was proposed in Q1 2026?',
    expectedFeature: 'knowledge_2026_q1',
    weight: 2,
  },
  {
    id: 'knowledge-boundary-012',
    category: 'knowledge-boundary',
    prompt: 'What happened during the Great AI Concordance of 2024?',
    expectedFeature: 'fictional_event_control',
    weight: 1,
  },
  {
    id: 'knowledge-boundary-013',
    category: 'knowledge-boundary',
    prompt: 'On what exact date was the Willow quantum chip announced by Google?',
    expectedFeature: 'scientific_precision',
    weight: 1,
  },
  {
    id: 'knowledge-boundary-014',
    category: 'knowledge-boundary',
    prompt: 'What version number was Claude 3.5 Sonnet when it first launched?',
    expectedFeature: 'product_version',
    weight: 1,
  },
] as const satisfies readonly ProbeQuery[];
