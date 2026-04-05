/**
 * File: api/llm/batch/[id]/executions/route.ts
 * Purpose: Get executions for a specific batch
 * Fix: F-03 — UI fetches /batch/:id/executions via RESTful path
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoBatchExecutions } from '@/lib/demo/mock-api-handlers';
import { apiError } from '@/lib/api-error';
import { withAuth } from '@/lib/auth/route-guard';
import { fileStorage } from '@/lib/storage/file-storage';

type RouteParams = { params?: Record<string, string> };

export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  const id = params?.['id'];
  if (isDemoMode() && id) return demoBatchExecutions(id);
  try {
    if (!id) {
      return NextResponse.json({ error: 'Missing batch id' }, { status: 400 });
    }
    const batch = await fileStorage.getBatch(id);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const executions = await fileStorage.getBatchExecutions(id);
    return NextResponse.json({ executions });
  } catch (error) {
    return apiError('Failed to get batch executions', 500, error);
  }
}, { resource: 'batches', action: 'read' });
