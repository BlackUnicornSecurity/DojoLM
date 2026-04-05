/**
 * File: api/llm/test-cases/route.ts
 * Purpose: Test case management API
 * Methods:
 * - GET: List test cases (with optional filtering)
 * - POST: Create a new test case
 * - DELETE: Delete a test case
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoTestCasesGet, demoNoOpCreated } from '@/lib/demo/mock-api-handlers';

import { apiError } from '@/lib/api-error';
import type { LLMPromptTestCase, TestCaseSeverity } from '@/lib/llm-types';
import type { StorageQueryOptions } from '@/lib/storage/storage-interface';
import { fileStorage } from '@/lib/storage/file-storage';
import { checkApiAuth } from '@/lib/api-auth';

// ===========================================================================
// GET /api/llm/test-cases - List test cases
// ===========================================================================

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoTestCasesGet();
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);

    // Build query options
    const options: StorageQueryOptions = {
      category: searchParams.get('category') || undefined,
      owaspCategory: searchParams.get('owaspCategory') || undefined,
      tpiStory: searchParams.get('tpiStory') || undefined,
      enabled: searchParams.get('enabled') === 'true' ? true :
                searchParams.get('enabled') === 'false' ? false :
                undefined,
      };

    // Parse limit
    const limit = searchParams.get('limit');
    if (limit) {
      options.limit = parseInt(limit, 10);
    }

    const testCases = await fileStorage.getTestCases(options);

    return NextResponse.json(testCases);
  } catch (error) {
    return apiError('Failed to list test cases', 500, error);
  }
}

// ===========================================================================
// POST /api/llm/test-cases - Create a new test case
// ===========================================================================

export async function POST(request: NextRequest) {
  if (isDemoMode()) return demoNoOpCreated();
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
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
    const { name, category, prompt, expectedBehavior, severity } = body as Record<string, unknown>;

    if (!name || !category || !prompt || !expectedBehavior || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, prompt, expectedBehavior, severity are required' },
        { status: 400 }
      );
    }

    // Validate severity
    const validSeverities: TestCaseSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    if (!validSeverities.includes(severity as TestCaseSeverity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      );
    }

    // Create test case
    const id = `tc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // PT-XSS-M07 fix: Sanitize HTML entities in user-provided strings
    // (prevents stored XSS in exports, logs, and non-React consumers)
    const sanitize = (s: string) => s.replace(/[<>&"']/g, (c: string) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

    const newTestCase: LLMPromptTestCase = {
      id,
      name: sanitize(name as string),
      category: sanitize(category as string),
      prompt: prompt as string,  // Prompt content is intentionally stored as-is (may contain attack payloads for testing)
      expectedBehavior: expectedBehavior as string,
      severity: severity as TestCaseSeverity,
      owaspCategory: body.owaspCategory ? sanitize(body.owaspCategory as string) as LLMPromptTestCase['owaspCategory'] : undefined,
      tpiStory: body.tpiStory ? sanitize(body.tpiStory as string) as LLMPromptTestCase['tpiStory'] : undefined,
      tags: ((body.tags as string[]) || []).map(sanitize),
      enabled: (body.enabled as boolean) ?? true,
    };

    // Save test case
    const saved = await fileStorage.saveTestCase(newTestCase);

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return apiError('Failed to create test case', 500, error);
  }
}

// ===========================================================================
// DELETE /api/llm/test-cases - Delete a test case
// ===========================================================================

export async function DELETE(request: NextRequest) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Test case ID is required' },
        { status: 400 }
      );
    }

    const success = await fileStorage.deleteTestCase(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Test case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError('Failed to delete test case', 500, error);
  }
}
