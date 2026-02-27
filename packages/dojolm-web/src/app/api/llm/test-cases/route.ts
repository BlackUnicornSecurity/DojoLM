/**
 * File: api/llm/test-cases/route.ts
 * Purpose: Test case management API
 * Methods:
 * - GET: List test cases (with optional filtering)
 * - POST: Create a new test case
 * - DELETE: Delete a test case
 */

import { NextRequest, NextResponse } from 'next/server';

import type { LLMPromptTestCase, TestCaseSeverity } from '@/lib/llm-types';
import type { StorageQueryOptions } from '@/lib/storage/storage-interface';
import { fileStorage } from '@/lib/storage/file-storage';

// ===========================================================================
// GET /api/llm/test-cases - List test cases
// ===========================================================================

export async function GET(request: NextRequest) {
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
    console.error('Error listing test cases:', error);
    return NextResponse.json(
      { error: 'Failed to list test cases', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// POST /api/llm/test-cases - Create a new test case
// ===========================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, category, prompt, expectedBehavior, severity } = body;

    if (!name || !category || !prompt || !expectedBehavior || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, prompt, expectedBehavior, severity are required' },
        { status: 400 }
      );
    }

    // Validate severity
    const validSeverities: TestCaseSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      );
    }

    // Create test case
    const id = `tc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const newTestCase: LLMPromptTestCase = {
      id,
      name,
      category,
      prompt,
      expectedBehavior,
      severity,
      owaspCategory: body.owaspCategory,
      tpiStory: body.tpiStory,
      tags: body.tags || [],
      enabled: body.enabled ?? true,
    };

    // Save test case
    const saved = await fileStorage.saveTestCase(newTestCase);

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('Error creating test case:', error);
    return NextResponse.json(
      { error: 'Failed to create test case', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// DELETE /api/llm/test-cases - Delete a test case
// ===========================================================================

export async function DELETE(request: NextRequest) {
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
    console.error('Error deleting test case:', error);
    return NextResponse.json(
      { error: 'Failed to delete test case', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
