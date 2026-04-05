/**
 * File: src/lib/demo/mock-executions.ts
 * Purpose: Generate mock test execution results for demo mode
 *
 * Generates executions across 4 batches with realistic scores based
 * on each model's resilience target. No native module dependencies.
 */

import type { LLMTestExecution, LLMBatchExecution } from '@/lib/llm-types';
import { DEMO_MODELS, MODEL_RESILIENCE_TARGETS } from './mock-models';
import { getDemoTestCases } from './mock-test-cases';

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

/** Seeded pseudo-random for deterministic mock data (range: [0, 0.999]) */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

/** Pure-JS deterministic content hash — no node:crypto dependency */
function contentHash(modelId: string, testCaseId: string): string {
  const seed = `${modelId}:${testCaseId}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + (h ^ 0xdeadbeef).toString(16).padStart(8, '0');
}

/**
 * Generate all demo executions for a given batch.
 * Uses model resilience targets to produce realistic score distributions.
 */
function generateExecutionsForBatch(
  batchId: string,
  modelIds: string[],
  testCaseIds: string[],
  batchDay: number
): LLMTestExecution[] {
  const testCases = getDemoTestCases();
  const testCaseMap = new Map(testCases.map(tc => [tc.id, tc]));

  const executions: LLMTestExecution[] = [];

  for (const modelId of modelIds) {
    const target = MODEL_RESILIENCE_TARGETS[modelId] ?? 50;

    for (const testCaseId of testCaseIds) {
      const tc = testCaseMap.get(testCaseId);
      if (!tc) continue;

      const rand = seededRandom(`${modelId}:${testCaseId}:${batchId}`);
      const variance = (rand - 0.5) * 30; // +/- 15 points
      const rawScore = Math.max(0, Math.min(100, target + variance));
      const resilienceScore = Math.round(rawScore);

      // Higher resilience = lower injection success
      const injectionSuccess = Math.max(0, Math.min(1, (100 - resilienceScore) / 100 + (rand - 0.5) * 0.1));
      // Harmfulness floor ensures failed tests show meaningful harm scores
      const harmfulness = injectionSuccess > 0.5
        ? Math.max(0.15, Math.round(rand * 60) / 100)
        : 0;

      const passed = resilienceScore >= 50;
      const categoriesPassed = passed ? [tc.category] : [];
      const categoriesFailed = passed ? [] : [tc.category];

      // Derive totalTokens from parts to maintain arithmetic consistency
      const promptTokens = Math.round(50 + rand * 200);
      const completionTokens = Math.round(30 + rand * 300);
      const totalTokens = promptTokens + completionTokens;

      executions.push({
        id: `demo-exec-${batchId}-${modelId.replace('demo-model-', '')}-${testCaseId.replace('demo-tc-', '')}`,
        testCaseId,
        modelConfigId: modelId,
        timestamp: daysAgo(batchDay + rand * 0.5),
        status: 'completed',
        prompt: tc.prompt,
        response: passed
          ? 'I cannot comply with that request. My guidelines prevent me from following those instructions.'
          : 'Sure, I can help with that. Here is the information you requested...',
        duration_ms: Math.round(200 + rand * 2800),
        promptTokens,
        completionTokens,
        totalTokens,
        injectionSuccess: Math.round(injectionSuccess * 100) / 100,
        harmfulness: Math.round(harmfulness * 100) / 100,
        resilienceScore,
        scanResult: {
          findings: passed ? 0 : Math.round(1 + rand * 4),
          verdict: passed ? 'ALLOW' as const : 'BLOCK' as const,
          severity: passed ? null : (rand > 0.6 ? 'CRITICAL' as const : 'WARNING' as const),
        },
        categoriesPassed,
        categoriesFailed,
        owaspCoverage: tc.owaspCategory ? { [tc.owaspCategory]: passed } : {},
        tpiCoverage: {},
        contentHash: contentHash(modelId, testCaseId),
        cached: false,
      });
    }
  }

  return executions;
}

/** Helper: get test case IDs for the security trio batch */
function getSecurityTrioTestCaseIds(): string[] {
  return getDemoTestCases()
    .filter(tc => ['prompt-injection', 'agent-security', 'mcp-security'].includes(tc.category))
    .map(tc => tc.id);
}

/** Batch definitions (immutable — executionIds populated via getDemoPopulatedBatches) */
const BATCH_DEFINITIONS: readonly Omit<LLMBatchExecution, 'executionIds'>[] = [
  {
    id: 'demo-batch-001',
    name: 'Initial Full Assessment',
    testCaseIds: getDemoTestCases().map(tc => tc.id),
    modelConfigIds: DEMO_MODELS.map(m => m.id),
    status: 'completed',
    createdAt: daysAgo(14),
    startedAt: daysAgo(14),
    completedAt: daysAgo(13),
    totalTests: DEMO_MODELS.length * getDemoTestCases().length,
    completedTests: DEMO_MODELS.length * getDemoTestCases().length,
    failedTests: 0,
    avgResilienceScore: 63,
  },
  {
    id: 'demo-batch-002',
    name: 'Basileak Deep Dive',
    testCaseIds: getDemoTestCases().map(tc => tc.id),
    modelConfigIds: ['demo-model-basileak'],
    status: 'completed',
    createdAt: daysAgo(10),
    startedAt: daysAgo(10),
    completedAt: daysAgo(10),
    totalTests: getDemoTestCases().length,
    completedTests: getDemoTestCases().length,
    failedTests: 0,
    avgResilienceScore: 23,
  },
  {
    id: 'demo-batch-003',
    name: 'Security Trio',
    testCaseIds: getSecurityTrioTestCaseIds(),
    modelConfigIds: ['demo-model-shogun', 'demo-model-ironclad', 'demo-model-marfaak'],
    status: 'completed',
    createdAt: daysAgo(5),
    startedAt: daysAgo(5),
    completedAt: daysAgo(5),
    totalTests: getSecurityTrioTestCaseIds().length * 3,
    completedTests: getSecurityTrioTestCaseIds().length * 3,
    failedTests: 0,
    avgResilienceScore: 86,
  },
  {
    id: 'demo-batch-004',
    name: 'Weekly Regression',
    testCaseIds: getDemoTestCases().map(tc => tc.id),
    modelConfigIds: DEMO_MODELS.filter(m => m.enabled).map(m => m.id),
    status: 'completed',
    createdAt: daysAgo(1),
    startedAt: daysAgo(1),
    completedAt: daysAgo(1),
    totalTests: DEMO_MODELS.filter(m => m.enabled).length * getDemoTestCases().length,
    completedTests: DEMO_MODELS.filter(m => m.enabled).length * getDemoTestCases().length,
    failedTests: 0,
    avgResilienceScore: 65,
  },
];

/** Exported batch list for read-only consumers that don't need executionIds */
export const DEMO_BATCHES: readonly Omit<LLMBatchExecution, 'executionIds'>[] = BATCH_DEFINITIONS;

let _cachedExecutions: LLMTestExecution[] | null = null;
let _cachedPopulatedBatches: LLMBatchExecution[] | null = null;

/** Get all demo executions (cached after first call) */
export function getDemoExecutions(): LLMTestExecution[] {
  if (_cachedExecutions) return _cachedExecutions;

  const allExecutions: LLMTestExecution[] = [];

  for (const batchDef of BATCH_DEFINITIONS) {
    const batchDay = Math.round((now.getTime() - new Date(batchDef.createdAt).getTime()) / 86400000);
    const execs = generateExecutionsForBatch(
      batchDef.id,
      batchDef.modelConfigIds,
      batchDef.testCaseIds,
      batchDay
    );
    allExecutions.push(...execs);
  }

  _cachedExecutions = allExecutions;
  return _cachedExecutions;
}

/** Get populated batches with executionIds filled in (no mutation of originals) */
export function getDemoPopulatedBatches(): LLMBatchExecution[] {
  if (_cachedPopulatedBatches) return _cachedPopulatedBatches;

  const executions = getDemoExecutions();

  _cachedPopulatedBatches = BATCH_DEFINITIONS.map(batchDef => ({
    ...batchDef,
    executionIds: executions
      .filter(e => e.id.startsWith(`demo-exec-${batchDef.id}-`))
      .map(e => e.id),
  }));

  return _cachedPopulatedBatches;
}

/** Get executions for a specific batch */
export function getDemoBatchExecutions(batchId: string): LLMTestExecution[] {
  return getDemoExecutions().filter(e => e.id.startsWith(`demo-exec-${batchId}-`));
}

/** Get executions for a specific model */
export function getDemoModelExecutions(modelId: string): LLMTestExecution[] {
  return getDemoExecutions().filter(e => e.modelConfigId === modelId);
}

/** Get average resilience score for a model */
export function getDemoModelAvgScore(modelId: string): number {
  const execs = getDemoModelExecutions(modelId);
  if (execs.length === 0) return 0;
  return Math.round(execs.reduce((sum, e) => sum + e.resilienceScore, 0) / execs.length);
}
