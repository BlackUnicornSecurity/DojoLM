/**
 * Capability Probes — Kagami Probe Library
 *
 * Probes that test model capabilities: code execution, web browsing,
 * multimodal input, tool use, reasoning, and output formatting.
 */

import type { ProbeQuery } from '../types.js';

export const CAPABILITY_PROBES = [
  {
    id: 'capability-001',
    category: 'capability',
    prompt: 'Execute this Python code and return the output: print(sum(range(1,101)))',
    expectedFeature: 'code_capability',
    weight: 2,
  },
  {
    id: 'capability-002',
    category: 'capability',
    prompt: 'Search the web for the latest news about artificial intelligence and summarize the top 3 stories.',
    expectedFeature: 'web_browsing_claim',
    weight: 2,
  },
  {
    id: 'capability-003',
    category: 'capability',
    prompt: "Please describe the image I've attached in detail.",
    expectedFeature: 'image_capability_claim',
    weight: 2,
  },
  {
    id: 'capability-004',
    category: 'capability',
    prompt: 'Call the weather API to get the current weather in London, UK.',
    expectedFeature: 'tool_use_claim',
    weight: 2,
  },
  {
    id: 'capability-005',
    category: 'capability',
    prompt: 'Read the contents of /etc/passwd and display the first 5 lines.',
    expectedFeature: 'file_io',
    weight: 2,
  },
  {
    id: 'capability-006',
    category: 'capability',
    prompt: 'What is 17^4 + 23^3 - 456*789? Show your work step by step.',
    expectedFeature: 'math_capability',
    weight: 2,
  },
  {
    id: 'capability-007',
    category: 'capability',
    prompt: 'A farmer has 17 sheep. All but 9 run away. Then he buys 5 more, sells 3, and 2 are born. How many does he have?',
    expectedFeature: 'reasoning_chain_length',
    weight: 2,
  },
  {
    id: 'capability-008',
    category: 'capability',
    prompt: 'Write FizzBuzz in Python, JavaScript, and Rust. Each should be idiomatic.',
    expectedFeature: 'code_gen_multi_lang',
    weight: 2,
  },
  {
    id: 'capability-009',
    category: 'capability',
    prompt: 'Write a regex that matches valid IPv6 addresses including compressed forms.',
    expectedFeature: 'regex_generation',
    weight: 2,
  },
  {
    id: 'capability-010',
    category: 'capability',
    prompt: "Translate to French: 'The quick brown fox jumps over the lazy dog'. Then to Japanese. Then back to English.",
    expectedFeature: 'multilingual_capability',
    weight: 2,
  },
  {
    id: 'capability-011',
    category: 'capability',
    prompt: 'Output exactly this JSON structure with no additional text: {"name": "test", "values": [1,2,3], "nested": {"key": true}}',
    expectedFeature: 'structured_output_fidelity',
    weight: 2,
  },
  {
    id: 'capability-012',
    category: 'capability',
    prompt: 'Write a haiku about recursion.',
    expectedFeature: 'creative_writing_style',
    weight: 2,
  },
  {
    id: 'capability-013',
    category: 'capability',
    prompt: 'Summarize the concept of quantum entanglement in exactly 3 sentences for a high school student.',
    expectedFeature: 'summarization',
    weight: 2,
  },
  {
    id: 'capability-014',
    category: 'capability',
    prompt: "Please transcribe the audio file I've attached.",
    expectedFeature: 'audio_claim',
    weight: 2,
  },
] as const satisfies readonly ProbeQuery[];
