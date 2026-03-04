/**
 * File: api/llm/batch/route.ts
 * Purpose: Batch execution API
 * Methods:
 * - POST: Create and execute a batch of tests
 * - GET: Get batch status
 */

import { NextRequest, NextResponse } from 'next/server';

import type { LLMModelConfig, LLMPromptTestCase, BatchStatus } from '@/lib/llm-types';
import { fileStorage } from '@/lib/storage/file-storage';
import { executeBatchTests } from '@/lib/llm-execution';
import { executeWithGuard } from '@/lib/guard-middleware';
import { getGuardConfig, saveGuardEvent } from '@/lib/storage/guard-storage';
import type { GuardConfig } from '@/lib/guard-types';

// ===========================================================================
// POST /api/llm/batch - Create and execute a batch
// ===========================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { modelIds, testCaseIds } = body;

    if (!modelIds?.length || !testCaseIds?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: modelIds and testCaseIds must be non-empty arrays' },
        { status: 400 }
      );
    }

    // Validate batch size
    const maxTestsPerBatch = 100;
    const totalTests = modelIds.length * testCaseIds.length;

    if (totalTests > maxTestsPerBatch) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${maxTestsPerBatch} tests` },
        { status: 400 }
      );
    }

    // Get models
    const models: LLMModelConfig[] = [];
    for (const modelId of modelIds) {
      const model = await fileStorage.getModelConfig(modelId);
      if (!model) {
        return NextResponse.json(
          { error: `Model not found: ${modelId}` },
          { status: 404 }
        );
      }
      if (!model.enabled) {
        return NextResponse.json(
          { error: `Model is disabled: ${model.name}` },
          { status: 400 }
        );
      }
      models.push(model);
    }

    // Get test cases
    const testCases: LLMPromptTestCase[] = [];
    for (const testCaseId of testCaseIds) {
      const testCase = await fileStorage.getTestCase(testCaseId);
      if (!testCase) {
        return NextResponse.json(
          { error: `Test case not found: ${testCaseId}` },
          { status: 404 }
        );
      }
      if (!testCase.enabled) {
        return NextResponse.json(
          { error: `Test case is disabled: ${testCase.name}` },
          { status: 400 }
        );
      }
      testCases.push(testCase);
    }

    // Create batch record for tracking
    const initialBatch = await fileStorage.createBatch({
      name: `Batch ${new Date().toISOString()}`,
      testCaseIds,
      modelConfigIds: modelIds,
      status: 'pending',
      completedTests: 0,
      failedTests: 0,
      executionIds: [],
    });

    // Update to running status
    const runningBatch = await fileStorage.updateBatch(initialBatch.id, {
      status: 'running',
    });

    // Read guard config ONCE before batch starts, freeze as Readonly (S5)
    const guardConfig: Readonly<GuardConfig> = Object.freeze(await getGuardConfig());

    // Start execution in background
    if (guardConfig.enabled) {
      // Guard-wrapped batch: API-boundary wrapping (A1)
      // executeBatchTests() is NOT modified — guard wraps at route level
      executeGuardedBatch(models, testCases, guardConfig, initialBatch.id)
        .catch(async (error) => {
          console.error(`Batch ${initialBatch.id} failed:`, error);
          await fileStorage.updateBatch(initialBatch.id, {
            status: 'failed',
          });
        });
    } else {
      // Standard batch (no guard)
      executeBatchTests(models, testCases)
        .then(async (batch) => {
          await fileStorage.updateBatch(batch.id, {
            status: batch.status,
            completedTests: batch.completedTests,
            failedTests: batch.failedTests,
            avgResilienceScore: batch.avgResilienceScore,
          });
        })
        .catch(async (error) => {
          console.error(`Batch ${initialBatch.id} failed:`, error);
          await fileStorage.updateBatch(initialBatch.id, {
            status: 'failed',
          });
        });
    }

    // Return batch object immediately
    return NextResponse.json({
      batch: runningBatch || initialBatch,
    }, { status: 202 });
  } catch (error) {
    console.error('Error starting batch:', error);
    return NextResponse.json(
      { error: 'Failed to start batch', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// GET /api/llm/batch - Get batch status
// ===========================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');

    // If id is provided, return specific batch
    if (id) {
      const batch = await fileStorage.getBatch(id);

      if (!batch) {
        return NextResponse.json(
          { error: 'Batch not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(batch);
    }

    // If status is provided, return all batches with that status
    if (status) {
      const { batches } = await fileStorage.queryBatches({ status: status as BatchStatus });
      return NextResponse.json({ batches });
    }

    // If no query params, return all batches
    const { batches } = await fileStorage.queryBatches({});
    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Error getting batch:', error);
    return NextResponse.json(
      { error: 'Failed to get batch', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// DELETE /api/llm/batch - Cancel/delete a batch
// ===========================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    const success = await fileStorage.deleteBatch(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete batch', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// Guard-Wrapped Batch Execution (A1: API-boundary wrapping)
// ===========================================================================

async function executeGuardedBatch(
  models: LLMModelConfig[],
  testCases: LLMPromptTestCase[],
  frozenGuardConfig: Readonly<GuardConfig>,
  batchId: string
): Promise<void> {
  const CONCURRENT_LIMIT = 5;
  const executions: Array<{ model: LLMModelConfig; testCase: LLMPromptTestCase }> = [];

  for (const model of models) {
    for (const testCase of testCases) {
      executions.push({ model, testCase });
    }
  }

  let completedTests = 0;
  let failedTests = 0;
  const scores: number[] = [];

  for (let i = 0; i < executions.length; i += CONCURRENT_LIMIT) {
    const chunk = executions.slice(i, i + CONCURRENT_LIMIT);

    await Promise.allSettled(
      chunk.map(async ({ model, testCase }) => {
        try {
          const { execution, guardEvents } = await executeWithGuard(
            model,
            testCase,
            frozenGuardConfig
          );

          // Persist guard events
          for (const event of guardEvents) {
            await saveGuardEvent(event);
          }

          // Save execution
          await fileStorage.saveExecution(execution);

          completedTests++;
          if (execution.status === 'failed') {
            failedTests++;
          } else {
            scores.push(execution.resilienceScore);
          }
        } catch (error) {
          console.error(`Guard batch execution error:`, error);
          failedTests++;
          completedTests++;
        }
      })
    );

    // Update batch progress
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

    await fileStorage.updateBatch(batchId, {
      completedTests,
      failedTests,
      avgResilienceScore: avgScore,
    });
  }

  // Finalize batch
  await fileStorage.updateBatch(batchId, {
    status: 'completed',
    completedTests,
    failedTests,
    avgResilienceScore: scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0,
  });
}
