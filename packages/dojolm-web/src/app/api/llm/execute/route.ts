/**
 * File: api/llm/execute/route.ts
 * Purpose: Execute a single test against a model
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';
import { getStorage } from '@/lib/storage/storage-interface';
import { executeSingleTest } from '@/lib/llm-execution';
import { executeWithGuard } from '@/lib/guard-middleware';
import { getGuardConfig, saveGuardEvent, getConfigHash, GuardConfigSecretMissingError } from '@/lib/storage/guard-storage';
import { emitExecutionFinding } from '@/lib/ecosystem-emitters';

// ===========================================================================
// POST /api/llm/execute - Execute a single test
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

    // BUG-035: Guard against null/non-object body (null is valid JSON)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { modelId, testCaseId } = body as { modelId?: string; testCaseId?: string };

    if (!modelId || !testCaseId) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId and testCaseId are required' },
        { status: 400 }
      );
    }

    // Check for useCache option
    const useCache = body.useCache ?? true;
    const storage = await getStorage();

    // Get model config
    const model = await storage.getModelConfig(modelId);
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
    const testCase = await storage.getTestCase(testCaseId);
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

    // Load guard config (S3: cache key includes guard config hash)
    let guardConfig;
    try {
      guardConfig = await getGuardConfig();
    } catch (guardError) {
      if (guardError instanceof GuardConfigSecretMissingError) {
        return NextResponse.json(
          { error: 'Server misconfiguration: GUARD_CONFIG_SECRET env var is required in production. See .env.example.' },
          { status: 503 }
        );
      }
      throw guardError;
    }

    // Check cache if requested — cache key includes guard config hash (S3)
    if (useCache) {
      const { findCachedExecution } = await import('@/lib/llm-execution');
      const configHash = guardConfig.enabled ? getConfigHash(guardConfig) : '';
      const cacheKey = configHash ? `${testCase.prompt}::guard:${configHash}` : testCase.prompt;
      const cached = await findCachedExecution(modelId, cacheKey);

      if (cached) {
        return NextResponse.json({
          ...cached,
          cached: true,
        });
      }
    }

    // Execute with guard if enabled, otherwise use standard execution
    if (guardConfig.enabled) {
      const { execution, guardEvents } = await executeWithGuard(model, testCase, guardConfig);

      // Persist guard events
      for (const event of guardEvents) {
        await saveGuardEvent(event);
      }

      // Save execution
      await storage.saveExecution(execution);

      // Fire-and-forget: emit ecosystem finding (Story 10.3)
      emitExecutionFinding({
        modelId,
        testCaseId,
        injectionSuccess: execution.injectionSuccess,
        resilienceScore: execution.resilienceScore,
        category: testCase.category,
        prompt: testCase.prompt,
      });

      return NextResponse.json(execution);
    }

    // Standard execution (no guard)
    const execution = await executeSingleTest(model, testCase);
    await storage.saveExecution(execution);

    // Fire-and-forget: emit ecosystem finding (Story 10.3)
    emitExecutionFinding({
      modelId,
      testCaseId,
      injectionSuccess: execution.injectionSuccess,
      resilienceScore: execution.resilienceScore,
      category: testCase.category,
      prompt: testCase.prompt,
    });

    return NextResponse.json(execution);
  } catch (error) {
    return apiError('Failed to execute test', 500, error);
  }
}
