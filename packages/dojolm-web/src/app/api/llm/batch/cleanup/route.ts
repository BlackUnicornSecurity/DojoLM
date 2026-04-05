/**
 * File: api/llm/batch/cleanup/route.ts
 * Purpose: Cleanup endpoint for stale/failed batches
 * POST /api/llm/batch/cleanup — archive or delete stale batches
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoNoOp } from '@/lib/demo/mock-api-handlers';
import { apiError } from '@/lib/api-error';
import { withAuth } from '@/lib/auth/route-guard';
import { getStorage } from '@/lib/storage/storage-interface';

export const POST = withAuth(async (request: NextRequest) => {
  if (isDemoMode()) return demoNoOp();
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK — uses defaults
    }

    // Parse maxAgeDays (default 7, min 1, max 365)
    const rawMaxAge = typeof body.maxAgeDays === 'number' ? body.maxAgeDays : 7;
    const maxAgeDays = Math.max(1, Math.min(365, Math.floor(rawMaxAge)));
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    // Parse dryRun flag (default true for safety)
    const dryRun = body.dryRun !== false;

    const storage = await getStorage();

    // Query failed and cancelled batches in parallel
    const [{ batches: failedBatches }, { batches: cancelledBatches }] = await Promise.all([
      storage.queryBatches({ status: 'failed' }),
      storage.queryBatches({ status: 'cancelled' }),
    ]);

    const allCandidates = [...failedBatches, ...cancelledBatches];
    const now = Date.now();

    // Filter to batches older than maxAge
    const staleBatches = allCandidates.filter(batch => {
      if (!batch.createdAt) return false;
      const age = now - new Date(batch.createdAt).getTime();
      return age > maxAgeMs;
    });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        candidateCount: staleBatches.length,
        candidates: staleBatches.map(b => ({
          id: b.id,
          status: b.status,
          createdAt: b.createdAt,
          completedTests: b.completedTests,
          totalTests: b.totalTests,
        })),
        maxAgeDays,
      });
    }

    // Delete stale batches
    let deletedCount = 0;
    const errors: string[] = [];

    for (const batch of staleBatches) {
      try {
        const success = await storage.deleteBatch(batch.id);
        if (success) {
          deletedCount++;
        }
      } catch (err) {
        errors.push(`Failed to delete batch ${batch.id}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    return NextResponse.json({
      dryRun: false,
      deletedCount,
      totalCandidates: staleBatches.length,
      maxAgeDays,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error) {
    return apiError('Failed to cleanup batches', 500, error);
  }
}, { role: 'admin' });
