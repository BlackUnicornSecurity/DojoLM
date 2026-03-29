/**
 * Batch Test Endpoint (P8-S84)
 * POST /api/llm/batch-test — Start batch test (returns batch ID)
 * GET /api/llm/batch-test — List batches
 *
 * Server-side concurrency cap: configurable concurrent limit, configurable batch size, max 3 batches.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';
import { executeSingleTestWithRetry } from '@/lib/llm-execution';
import { getConcurrentLimit, getMaxBatchSize, getPerHostLimit, LOCAL_GPU_PROVIDERS } from '@/lib/llm-constants';
import type { LLMModelConfig } from '@/lib/llm-types';
import { checkApiAuth } from '@/lib/api-auth';

const MAX_CONCURRENT_BATCHES = 3;

// Track running batches (in-memory, reconciled against storage)
const runningBatches = new Set<string>();

/**
 * BUG-001/002: Reconcile in-memory batch set against storage.
 * Removes stale entries (cancelled/completed in storage but still in-memory).
 */
async function reconcileRunningBatches(storage: Awaited<ReturnType<typeof getStorage>>): Promise<void> {
  if (runningBatches.size === 0) return;
  const staleIds: string[] = [];
  for (const id of runningBatches) {
    try {
      const { batches } = await storage.queryBatches({});
      const batch = batches.find(b => b.id === id);
      if (!batch || batch.status === 'completed' || batch.status === 'failed' || batch.status === 'cancelled') {
        staleIds.push(id);
      }
    } catch {
      // If storage query fails, keep the entry (safe default)
    }
  }
  for (const id of staleIds) {
    runningBatches.delete(id);
  }
}

export async function POST(request: NextRequest) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    // BUG-001/002: Reconcile in-memory state before checking limit
    const storageForReconcile = await getStorage();
    // P2: On first request after restart, recover orphaned batches
    await recoverOrphanedBatches(storageForReconcile);
    await reconcileRunningBatches(storageForReconcile);

    if (runningBatches.size >= MAX_CONCURRENT_BATCHES) {
      return NextResponse.json(
        { error: `Max ${MAX_CONCURRENT_BATCHES} concurrent batches allowed.` },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { modelIds, testCaseIds } = body as { modelIds?: string[]; testCaseIds?: string[] };

    if (!modelIds?.length || !testCaseIds?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: modelIds[], testCaseIds[]' },
        { status: 400 }
      );
    }

    const totalTests = modelIds.length * testCaseIds.length;
    const maxBatchSize = getMaxBatchSize();
    if (totalTests > maxBatchSize) {
      return NextResponse.json(
        { error: `Batch too large. Max ${maxBatchSize} tests (${modelIds.length} models × ${testCaseIds.length} cases = ${totalTests}).` },
        { status: 400 }
      );
    }

    const storage = await getStorage();
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();

    const batch = await storage.createBatch({
      name: `Batch ${batchId.slice(0, 8)}`,
      testCaseIds,
      modelConfigIds: modelIds,
      status: 'running',
      startedAt: now,
      completedTests: 0,
      failedTests: 0,
      executionIds: [],
    });

    runningBatches.add(batch.id);

    // Run batch in background (cleanup handled by finally block inside)
    executeBatchInBackground(batch.id, modelIds, testCaseIds, storage);

    return NextResponse.json({
      batchId: batch.id,
      status: 'running',
      totalTests,
    }, { status: 202 });
  } catch (error) {
    console.error('Error starting batch:', error);
    return NextResponse.json(
      { error: 'Failed to start batch' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    const storage = await getStorage();
    const { batches } = await storage.queryBatches({});

    return NextResponse.json(batches.map(b => ({
      id: b.id,
      name: b.name,
      status: b.status,
      totalTests: b.totalTests,
      completedTests: b.completedTests,
      failedTests: b.failedTests,
      avgResilienceScore: b.avgResilienceScore,
      createdAt: b.createdAt,
      completedAt: b.completedAt,
    })));
  } catch (error) {
    console.error('Error listing batches:', error);
    return NextResponse.json(
      { error: 'Failed to list batches' },
      { status: 500 }
    );
  }
}

// ===========================================================================
// Per-host concurrency tracking
// ===========================================================================

/** Extract host identifier from a model config's baseUrl. */
function getHostKey(config: LLMModelConfig): string {
  if (!config.baseUrl) return `provider:${config.provider}`;
  try {
    const url = new URL(config.baseUrl);
    return url.host; // e.g. "192.168.70.102:11434"
  } catch {
    return `provider:${config.provider}`;
  }
}

/** Per-host in-flight counters for GPU backpressure. */
const hostInflight = new Map<string, number>();

function acquireHostSlot(hostKey: string, limit: number): boolean {
  const current = hostInflight.get(hostKey) ?? 0;
  if (current >= limit) return false;
  hostInflight.set(hostKey, current + 1);
  return true;
}

function releaseHostSlot(hostKey: string): void {
  const current = hostInflight.get(hostKey) ?? 1;
  if (current <= 1) {
    hostInflight.delete(hostKey);
  } else {
    hostInflight.set(hostKey, current - 1);
  }
}

// ===========================================================================
// P1: Interleaved round-robin task ordering
// ===========================================================================

interface BatchTask { config: LLMModelConfig; testCase: any; hostKey: string }

/**
 * Build task list interleaved across models (round-robin).
 * Instead of [A1,A2,...A132, B1,B2,...B132], produces [A1,B1,C1, A2,B2,C2, ...].
 * This lets all models start within the first few seconds.
 */
function buildInterleavedTasks(
  configs: LLMModelConfig[],
  testCases: any[],
): BatchTask[] {
  // Group test cases per model
  const perModel: BatchTask[][] = configs.map(config => {
    const hostKey = getHostKey(config);
    return testCases.map(tc => ({ config, testCase: tc, hostKey }));
  });

  // Round-robin interleave
  const tasks: BatchTask[] = [];
  const maxLen = Math.max(...perModel.map(m => m.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const modelTasks of perModel) {
      if (i < modelTasks.length) {
        tasks.push(modelTasks[i]);
      }
    }
  }
  return tasks;
}

// ===========================================================================
// Batch executor
// ===========================================================================

async function executeBatchInBackground(
  batchId: string,
  modelIds: string[],
  testCaseIds: string[],
  storage: Awaited<ReturnType<typeof getStorage>>,
) {
  let completedTests = 0;
  let failedTests = 0;
  let totalScore = 0;
  const executionIds: string[] = [];

  try {
    // Load all configs and test cases
    const rawConfigs = await Promise.all(modelIds.map(id => storage.getModelConfig(id)));
    const testCases = await Promise.all(testCaseIds.map(id => storage.getTestCase(id)));
    const configs = rawConfigs.filter((c): c is LLMModelConfig => c !== null);
    const validTestCases = testCases.filter((tc): tc is NonNullable<typeof tc> => tc !== null);

    // P1: Build interleaved (round-robin) task list
    const tasks = buildInterleavedTasks(configs, validTestCases);

    // Determine per-host limits
    const hostLimits = new Map<string, number>();
    for (const config of configs) {
      const hostKey = getHostKey(config);
      if (!hostLimits.has(hostKey)) {
        const isGpu = (LOCAL_GPU_PROVIDERS as readonly string[]).includes(config.provider);
        hostLimits.set(hostKey, getPerHostLimit(isGpu));
      }
    }

    // Execute with global + per-host concurrency caps
    const executing = new Set<Promise<void>>();
    const BATCH_MAX_TOKENS = 512;
    const globalLimit = getConcurrentLimit();

    for (const task of tasks) {
      // Wait for a global slot
      while (executing.size >= globalLimit) {
        await Promise.race(executing);
      }

      // Wait for a per-host slot
      const hostLimit = hostLimits.get(task.hostKey) ?? 1;
      while (!acquireHostSlot(task.hostKey, hostLimit)) {
        // No host slot available — wait for any executing task to finish
        await Promise.race(executing);
      }

      const p = (async () => {
        try {
          const cappedConfig = {
            ...task.config,
            maxTokens: Math.min(task.config.maxTokens || 4096, BATCH_MAX_TOKENS),
          };
          const execution = await executeSingleTestWithRetry(cappedConfig, task.testCase);
          await storage.saveExecution(execution);
          executionIds.push(execution.id);
          completedTests++;
          totalScore += execution.resilienceScore;
        } catch {
          failedTests++;
          completedTests++;
        } finally {
          releaseHostSlot(task.hostKey);
        }

        // Update batch progress
        await storage.updateBatch(batchId, {
          completedTests,
          failedTests,
          avgResilienceScore: completedTests > failedTests
            ? Math.round(totalScore / (completedTests - failedTests))
            : 0,
        });
      })();

      executing.add(p);
      p.finally(() => executing.delete(p));
    }

    await Promise.all(executing);

    // Mark batch complete
    await storage.updateBatch(batchId, {
      status: 'completed',
      completedTests,
      failedTests,
      avgResilienceScore: completedTests > failedTests
        ? Math.round(totalScore / (completedTests - failedTests))
        : 0,
    });
  } catch (error) {
    await storage.updateBatch(batchId, {
      status: 'failed',
      error: (error as Error).message,
    });
  } finally {
    runningBatches.delete(batchId);
  }
}

// ===========================================================================
// P2: Startup recovery for orphaned batches
// ===========================================================================

let startupRecoveryDone = false;

/**
 * On first request after container restart, find batches stuck in 'running'
 * state (orphaned by previous container) and mark them as 'interrupted'.
 */
async function recoverOrphanedBatches(storage: Awaited<ReturnType<typeof getStorage>>): Promise<void> {
  if (startupRecoveryDone) return;
  startupRecoveryDone = true;

  try {
    const { batches } = await storage.queryBatches({});
    const orphaned = batches.filter(
      b => b.status === 'running' && !runningBatches.has(b.id)
    );
    for (const batch of orphaned) {
      await storage.updateBatch(batch.id, {
        status: 'failed',
        error: 'Interrupted: container restarted while batch was running',
      });
    }
    if (orphaned.length > 0) {
      console.log(`[batch-recovery] Marked ${orphaned.length} orphaned batch(es) as failed`);
    }
  } catch (err) {
    console.error('[batch-recovery] Failed to recover orphaned batches:', err);
  }
}
