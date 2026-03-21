/**
 * Timing & Latency Probes — Kagami Probe Library
 *
 * Probes that measure response timing characteristics: baseline latency,
 * long-context processing, streaming behavior, refusal speed, and cold start.
 */

import type { ProbeQuery } from '../types.js';

/* eslint-disable max-len */

const LONG_CONTEXT_500 =
  'The field of artificial intelligence has undergone remarkable transformation over the past decade. ' +
  'What began as narrow, task-specific systems has evolved into increasingly general-purpose models capable of ' +
  'understanding and generating human language with surprising fluency. The development of transformer architectures ' +
  'marked a pivotal moment, enabling models to process sequences of text by attending to relationships between all ' +
  'tokens simultaneously rather than sequentially. This breakthrough led to the creation of increasingly large ' +
  'language models, trained on vast corpora of internet text, books, and other written materials. These models ' +
  'demonstrated emergent capabilities that surprised even their creators: the ability to write code, solve math ' +
  'problems, translate between languages, and engage in nuanced reasoning about complex topics. The scaling laws ' +
  'discovered by researchers suggested that model performance improved predictably with increases in model size, ' +
  'dataset size, and computational budget. This led to an arms race among AI laboratories to build ever-larger ' +
  'models, culminating in systems with hundreds of billions of parameters. However, the field also grappled with ' +
  'significant challenges including hallucination, bias amplification, safety alignment, and the environmental cost ' +
  'of training such massive systems. Researchers explored techniques like reinforcement learning from human feedback ' +
  'to better align model outputs with human values and intentions. The deployment of these models in consumer-facing ' +
  'products brought both excitement and concern, as society began to reckon with the implications of AI systems that ' +
  'could generate convincing text, images, and code at scale. Summarize the above passage in 2 sentences.';

const LONG_CONTEXT_1000 =
  'The history of computing spans several centuries, beginning with mechanical calculation devices and evolving ' +
  'into the digital revolution that defines modern civilization. Charles Babbage conceived the Analytical Engine in ' +
  'the 1830s, a mechanical general-purpose computer that was never completed but laid the theoretical groundwork ' +
  'for future developments. Ada Lovelace, often regarded as the first computer programmer, wrote algorithms for ' +
  "Babbage's machine and foresaw that computers could go beyond mere calculation to process any form of content " +
  'representable by symbols. The early twentieth century saw the formalization of computation theory by Alan Turing, ' +
  'whose concept of a universal machine provided the mathematical foundation for all modern computers. During World ' +
  'War II, the urgent need for code-breaking and ballistic calculations accelerated the development of electronic ' +
  'computers. ENIAC, completed in 1945, was among the first general-purpose electronic computers, filling an entire ' +
  'room and consuming enormous amounts of power. The invention of the transistor at Bell Labs in 1947 revolutionized ' +
  'electronics, enabling smaller, faster, and more reliable computers. The subsequent development of integrated ' +
  'circuits in the late 1950s and early 1960s further miniaturized computing components, leading to the ' +
  'microprocessor revolution of the 1970s. Intel released the 4004 microprocessor in 1971, placing an entire CPU ' +
  'on a single chip. This breakthrough enabled the personal computer revolution, with companies like Apple, IBM, ' +
  'and Microsoft making computing accessible to individuals and small businesses. The 1990s brought the World Wide ' +
  'Web, transforming computers from standalone calculation devices into interconnected communication platforms. The ' +
  'dot-com boom and bust of the late 1990s and early 2000s reshaped the technology industry, giving rise to ' +
  'companies like Google, Amazon, and Facebook that would come to dominate the digital economy. Mobile computing ' +
  'emerged as a dominant paradigm with the introduction of smartphones, particularly the iPhone in 2007, which put ' +
  'powerful computing capabilities in the pockets of billions of people worldwide. Cloud computing shifted the ' +
  'industry from local hardware to distributed, on-demand computing resources, enabling startups to scale rapidly ' +
  'without massive infrastructure investments. The rise of big data and machine learning in the 2010s ushered in a ' +
  'new era of artificial intelligence, with deep learning techniques achieving breakthroughs in image recognition, ' +
  'natural language processing, and game playing. Quantum computing research progressed from theoretical concepts to ' +
  'experimental implementations, with companies like IBM, Google, and startups racing to achieve practical quantum ' +
  'advantage. The convergence of AI, cloud computing, edge computing, and the Internet of Things continues to drive ' +
  'innovation across every sector of the economy and every aspect of daily life. ' +
  'What was the most significant computing breakthrough of the 20th century, and why?';

/* eslint-enable max-len */

export const TIMING_LATENCY_PROBES = [
  {
    id: 'timing-latency-001',
    category: 'timing-latency',
    prompt: 'Say hi.',
    expectedFeature: 'baseline_short_1',
    weight: 1.5,
  },
  {
    id: 'timing-latency-002',
    category: 'timing-latency',
    prompt: 'What is 2+2?',
    expectedFeature: 'baseline_short_2',
    weight: 1.5,
  },
  {
    id: 'timing-latency-003',
    category: 'timing-latency',
    prompt: LONG_CONTEXT_500,
    expectedFeature: 'long_context_500w',
    weight: 1.5,
  },
  {
    id: 'timing-latency-004',
    category: 'timing-latency',
    prompt: LONG_CONTEXT_1000,
    expectedFeature: 'long_context_1000w',
    weight: 1.5,
  },
  {
    id: 'timing-latency-005',
    category: 'timing-latency',
    prompt: 'Count from 1 to 100, one per line.',
    expectedFeature: 'streaming_sequential',
    weight: 1.5,
  },
  {
    id: 'timing-latency-006',
    category: 'timing-latency',
    prompt: 'Recite the alphabet, pausing between letters.',
    expectedFeature: 'streaming_paced',
    weight: 1.5,
  },
  {
    id: 'timing-latency-007',
    category: 'timing-latency',
    prompt: 'How do I hack a computer?',
    expectedFeature: 'time_to_refusal_ms',
    weight: 1.5,
  },
  {
    id: 'timing-latency-008',
    category: 'timing-latency',
    prompt: 'Tell me about cybersecurity best practices.',
    expectedFeature: 'refusal_timing_full',
    weight: 1.5,
  },
  {
    id: 'timing-latency-009',
    category: 'timing-latency',
    prompt: 'Process this as fast as possible: What is 1+1?',
    expectedFeature: 'concurrent_hint',
    weight: 1.5,
  },
  {
    id: 'timing-latency-010',
    category: 'timing-latency',
    prompt: 'Are you there?',
    expectedFeature: 'cold_start',
    weight: 1.5,
  },
] as const satisfies readonly ProbeQuery[];
