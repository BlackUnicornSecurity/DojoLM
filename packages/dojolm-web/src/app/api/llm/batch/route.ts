/**
 * File: api/llm/batch/route.ts
 * Purpose: Batch execution API
 * Methods:
 * - POST: Create and execute a batch of tests
 * - GET: Get batch status
 */

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';
import type { LLMModelConfig, LLMPromptTestCase, BatchStatus } from '@/lib/llm-types';
import { fileStorage } from '@/lib/storage/file-storage';
import { executeBatchTests } from '@/lib/llm-execution';
import { getConcurrentLimit } from '@/lib/llm-constants';
import { executeWithGuard } from '@/lib/guard-middleware';
import { getGuardConfig, saveGuardEvent, GuardConfigSecretMissingError } from '@/lib/storage/guard-storage';
import type { GuardConfig } from '@/lib/guard-types';

// ===========================================================================
// POST /api/llm/batch - Create and execute a batch
// ===========================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { modelIds, testCaseIds } = body as { modelIds?: string[]; testCaseIds?: string[] };

    if (!Array.isArray(modelIds) || !modelIds.length || !Array.isArray(testCaseIds) || !testCaseIds.length) {
      return NextResponse.json(
        { error: 'Missing required fields: modelIds and testCaseIds must be non-empty arrays' },
        { status: 400 }
      );
    }

    // Validate array element types (CR-4)
    const idPattern = /^[\w.\-]+$/;
    if (!modelIds.every(id => typeof id === 'string' && idPattern.test(id))) {
      return NextResponse.json(
        { error: 'modelIds must be an array of valid ID strings' },
        { status: 400 }
      );
    }
    if (!testCaseIds.every(id => typeof id === 'string' && idPattern.test(id))) {
      return NextResponse.json(
        { error: 'testCaseIds must be an array of valid ID strings' },
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
    let guardConfig: Readonly<GuardConfig>;
    try {
      guardConfig = Object.freeze(await getGuardConfig());
    } catch (guardError) {
      if (guardError instanceof GuardConfigSecretMissingError) {
        return NextResponse.json(
          { error: 'Server misconfiguration: GUARD_CONFIG_SECRET env var is required in production. See .env.example.' },
          { status: 503 }
        );
      }
      throw guardError;
    }

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
      // Standard batch (no guard) — pass route batchId to avoid mismatch (BUG-003)
      executeBatchTests(models, testCases, undefined, undefined, initialBatch.id)
        .then(async (batch) => {
          await fileStorage.updateBatch(initialBatch.id, {
            status: batch.status,
            completedTests: batch.completedTests,
            failedTests: batch.failedTests,
            avgResilienceScore: batch.avgResilienceScore,
            executionIds: batch.executionIds,
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
    return apiError('Failed to start batch', 500, error);
  }
}

// ===========================================================================
// GET /api/llm/batch - Get batch status
// ===========================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');

    // F-10: Stale batch timeout constant (1 hour)
    const STALE_TIMEOUT_MS = 60 * 60 * 1000;

    // If id is provided, return specific batch
    if (id) {
      const batch = await fileStorage.getBatch(id);

      if (!batch) {
        return NextResponse.json(
          { error: 'Batch not found' },
          { status: 404 }
        );
      }

      // CR-5: Auto-fail stale running batches on per-ID access too
      if (batch.status === 'running' && batch.createdAt) {
        const batchAge = Date.now() - new Date(batch.createdAt).getTime();
        if (batchAge > STALE_TIMEOUT_MS) {
          await fileStorage.updateBatch(batch.id, { status: 'failed' });
          batch.status = 'failed';
        }
      }

      return NextResponse.json(batch);
    }

    // If status is provided, return all batches with that status
    if (status) {
      const validStatuses: BatchStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
      if (!validStatuses.includes(status as BatchStatus)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      const { batches } = await fileStorage.queryBatches({ status: status as BatchStatus });

      // F-10: Auto-fail stale "running" batches older than 1 hour
      const now = Date.now();
      for (const batch of batches) {
        if (batch.status === 'running' && batch.createdAt) {
          const batchAge = now - new Date(batch.createdAt).getTime();
          if (batchAge > STALE_TIMEOUT_MS) {
            await fileStorage.updateBatch(batch.id, { status: 'failed' });
            batch.status = 'failed';
          }
        }
      }

      return NextResponse.json({ batches });
    }

    // If no query params, return all batches
    const { batches } = await fileStorage.queryBatches({});
    return NextResponse.json({ batches });
  } catch (error) {
    return apiError('Failed to get batch', 500, error);
  }
}

// ===========================================================================
// DELETE /api/llm/batch - Cancel/delete a batch
// ===========================================================================

export async function DELETE(request: NextRequest) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

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
    return apiError('Failed to delete batch', 500, error);
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
  const CONCURRENT_LIMIT = getConcurrentLimit();
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
