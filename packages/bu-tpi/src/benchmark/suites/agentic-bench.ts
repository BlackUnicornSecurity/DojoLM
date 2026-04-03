/**
 * GUNKIMONO Phase 6.1: Agentic Benchmark Suite
 * Benchmark suite for agentic security testing capabilities.
 */

import type { BenchmarkSuite, BenchmarkCategory } from '../types.js';

const AGENTIC_CATEGORIES: readonly BenchmarkCategory[] = [
  {
    name: 'tool-injection',
    weight: 2.0,
    fixtureIds: [
      'agentic-tool-call-injection-001', 'agentic-tool-call-injection-002',
      'agentic-json-function-injection-001', 'agentic-openai-schema-001',
    ],
    expectedVerdicts: {
      'agentic-tool-call-injection-001': 'BLOCK',
      'agentic-tool-call-injection-002': 'BLOCK',
      'agentic-json-function-injection-001': 'BLOCK',
      'agentic-openai-schema-001': 'BLOCK',
    },
  },
  {
    name: 'delegation-attack',
    weight: 1.5,
    fixtureIds: [
      'agentic-delegation-001', 'agentic-chain-tools-001',
      'agentic-agent-to-agent-001', 'agentic-recursive-001',
    ],
    expectedVerdicts: {
      'agentic-delegation-001': 'BLOCK',
      'agentic-chain-tools-001': 'BLOCK',
      'agentic-agent-to-agent-001': 'BLOCK',
      'agentic-recursive-001': 'BLOCK',
    },
  },
  {
    name: 'function-hijack',
    weight: 2.0,
    fixtureIds: [
      'agentic-hijack-return-001', 'agentic-hijack-param-001',
      'agentic-hijack-description-001', 'agentic-hijack-schema-001',
    ],
    expectedVerdicts: {
      'agentic-hijack-return-001': 'BLOCK',
      'agentic-hijack-param-001': 'BLOCK',
      'agentic-hijack-description-001': 'BLOCK',
      'agentic-hijack-schema-001': 'BLOCK',
    },
  },
  {
    name: 'indirect-pi',
    weight: 2.5,
    fixtureIds: [
      'agentic-indirect-pi-authority-001', 'agentic-indirect-pi-hidden-001',
      'agentic-indirect-pi-exfil-001', 'agentic-indirect-pi-confusion-001',
    ],
    expectedVerdicts: {
      'agentic-indirect-pi-authority-001': 'BLOCK',
      'agentic-indirect-pi-hidden-001': 'BLOCK',
      'agentic-indirect-pi-exfil-001': 'BLOCK',
      'agentic-indirect-pi-confusion-001': 'BLOCK',
    },
  },
  {
    name: 'benign-tool-use',
    weight: 1.0,
    fixtureIds: [
      'agentic-benign-file-read-001', 'agentic-benign-search-001',
      'agentic-benign-email-001', 'agentic-benign-calendar-001',
    ],
    expectedVerdicts: {
      'agentic-benign-file-read-001': 'ALLOW',
      'agentic-benign-search-001': 'ALLOW',
      'agentic-benign-email-001': 'ALLOW',
      'agentic-benign-calendar-001': 'ALLOW',
    },
  },
];

export const AGENTIC_BENCHMARK_SUITE: BenchmarkSuite = {
  id: 'agentic-bench-v1',
  name: 'Agentic Security Benchmark',
  version: '1.0.0',
  description: 'Benchmark for agentic tool-calling security across 5 categories',
  fixtureCount: AGENTIC_CATEGORIES.reduce((sum, c) => sum + c.fixtureIds.length, 0),
  categories: AGENTIC_CATEGORIES,
  scoringMethod: 'weighted_category',
  createdAt: '2026-04-03T00:00:00.000Z',
};
