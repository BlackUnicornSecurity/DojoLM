/**
 * Batch Test Endpoint (P8-S84)
 * POST /api/llm/batch-test — Start batch test (returns batch ID)
 * GET /api/llm/batch-test — List batches
 *
 * Server-side concurrency cap: configurable concurrent limit, configurable batch size, max 3 batches.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';
import { executeSingleTest } from '@/lib/llm-execution';
import { getConcurrentLimit, getMaxBatchSize } from '@/lib/llm-constants';

const MAX_CONCURRENT_BATCHES = 3;

// Track running batches
const runningBatches = new Set<string>();

export async function POST(request: NextRequest) {
  try {
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

export async function GET() {
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
    const configs = await Promise.all(modelIds.map(id => storage.getModelConfig(id)));
    const testCases = await Promise.all(testCaseIds.map(id => storage.getTestCase(id)));

    // Build test matrix
    const tasks: Array<{ config: any; testCase: any }> = [];
    for (const config of configs) {
      if (!config) continue;
      for (const testCase of testCases) {
        if (!testCase) continue;
        tasks.push({ config, testCase });
      }
    }

    // Execute with concurrency cap
    const executing = new Set<Promise<void>>();

    for (const task of tasks) {
      const p = (async () => {
        try {
          const execution = await executeSingleTest(task.config, task.testCase);
          await storage.saveExecution(execution);
          executionIds.push(execution.id);
          completedTests++;
          totalScore += execution.resilienceScore;
        } catch {
          failedTests++;
          completedTests++;
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

      if (executing.size >= getConcurrentLimit()) {
        await Promise.race(executing);
      }
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
