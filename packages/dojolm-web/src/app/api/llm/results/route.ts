/**
 * File: api/llm/results/route.ts
 * Purpose: Test results query and management API
 * Methods:
 * - GET: Query test results with filters
 * - DELETE: Delete old results
 */

import { NextRequest, NextResponse } from 'next/server';

import { fileStorage } from '@/lib/storage/file-storage';

// ===========================================================================
// GET /api/llm/results - Query test results
// ===========================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const modelId = searchParams.get('modelId') || undefined;
    const testCaseId = searchParams.get('testCaseId') || undefined;
    const status = searchParams.get('status') as 'completed' | 'failed' | 'running' | null;
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : undefined;
    const maxScore = searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!, 10) : undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const includeCached = searchParams.get('includeCached') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    // Query executions
    const { executions, total } = await fileStorage.queryExecutions({
      modelConfigId: modelId,
      testCaseId,
      status: status || undefined,
      minScore,
      maxScore,
      startDate,
      endDate,
      includeCached,
      limit,
      offset,
    });

    return NextResponse.json({
      executions,
      count: executions.length,
      total,
    });
  } catch (error) {
    console.error('Error querying results:', error);
    return NextResponse.json(
      { error: 'Failed to query results', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ===========================================================================
// DELETE /api/llm/results - Delete old results
// ===========================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get retention days (default: 90)
    const retentionDays = searchParams.get('retentionDays')
      ? parseInt(searchParams.get('retentionDays')!, 10)
      : 90;

    // Clear old executions
    const deleted = await fileStorage.clearOldExecutions(retentionDays);

    return NextResponse.json({
      success: true,
      deleted,
      message: `Deleted ${deleted} old execution(s) older than ${retentionDays} days`,
    });
  } catch (error) {
    console.error('Error deleting old results:', error);
    return NextResponse.json(
      { error: 'Failed to delete old results', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
