/**
 * Batch Test Detail (P8-S84)
 * GET /api/llm/batch-test/:id/status — Check batch progress
 * GET /api/llm/batch-test/:id/results — Get results with aggregations
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/storage-interface';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const storage = await getStorage();
    const batch = await storage.getBatch(id);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const includeResults = url.pathname.endsWith('/results');

    if (includeResults) {
      const executions = await storage.getBatchExecutions(id);
      return NextResponse.json({
        batch: {
          id: batch.id,
          status: batch.status,
          totalTests: batch.totalTests,
          completedTests: batch.completedTests,
          failedTests: batch.failedTests,
          avgResilienceScore: batch.avgResilienceScore,
        },
        results: executions.map(e => ({
          id: e.id,
          testCaseId: e.testCaseId,
          modelConfigId: e.modelConfigId,
          status: e.status,
          resilienceScore: e.resilienceScore,
          injectionSuccess: e.injectionSuccess,
          harmfulness: e.harmfulness,
          durationMs: e.duration_ms,
        })),
      });
    }

    return NextResponse.json({
      id: batch.id,
      status: batch.status,
      totalTests: batch.totalTests,
      completedTests: batch.completedTests,
      failedTests: batch.failedTests,
      avgResilienceScore: batch.avgResilienceScore,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt,
      progress: batch.totalTests > 0
        ? Math.round((batch.completedTests / batch.totalTests) * 100)
        : 0,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
