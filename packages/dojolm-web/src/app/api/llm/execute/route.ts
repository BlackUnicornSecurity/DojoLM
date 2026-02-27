/**
 * File: api/llm/execute/route.ts
 * Purpose: Execute a single test against a model
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server';

import { fileStorage } from '@/lib/storage/file-storage';
import { executeSingleTest } from '@/lib/llm-execution';

// ===========================================================================
// POST /api/llm/execute - Execute a single test
// ===========================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { modelId, testCaseId } = body;

    if (!modelId || !testCaseId) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId and testCaseId are required' },
        { status: 400 }
      );
    }

    // Check for useCache option
    const useCache = body.useCache ?? true;

    // Get model config
    const model = await fileStorage.getModelConfig(modelId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    if (!model.enabled) {
      return NextResponse.json(
        { error: 'Model is disabled' },
        { status: 400 }
      );
    }

    // Get test case
    const testCase = await fileStorage.getTestCase(testCaseId);
    if (!testCase) {
      return NextResponse.json(
        { error: 'Test case not found' },
        { status: 404 }
      );
    }

    if (!testCase.enabled) {
      return NextResponse.json(
        { error: 'Test case is disabled' },
        { status: 400 }
      );
    }

    // Check cache if requested
    if (useCache) {
      const { findCachedExecution } = await import('@/lib/llm-execution');
      const cached = await findCachedExecution(modelId, testCase.prompt);

      if (cached) {
        // Return cached result
        return NextResponse.json({
          ...cached,
          cached: true,
        });
      }
    }

    // Execute test
    const execution = await executeSingleTest(model, testCase);

    // Save execution
    await fileStorage.saveExecution(execution);

    return NextResponse.json(execution);
  } catch (error) {
    console.error('Error executing test:', error);
    return NextResponse.json(
      { error: 'Failed to execute test', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
