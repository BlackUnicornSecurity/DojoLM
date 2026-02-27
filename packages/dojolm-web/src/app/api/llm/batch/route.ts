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

    // Start execution in background
    executeBatchTests(models, testCases)
      .then(async (batch) => {
        // Update batch with completion data
        await fileStorage.updateBatch(batch.id, {
          status: batch.status,
          completedTests: batch.completedTests,
          failedTests: batch.failedTests,
          avgResilienceScore: batch.avgResilienceScore,
        });
        console.log(`Batch ${batch.id} completed:`, batch);
      })
      .catch(async (error) => {
        console.error(`Batch ${initialBatch.id} failed:`, error);
        // Update batch with failed status
        await fileStorage.updateBatch(initialBatch.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      });

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
