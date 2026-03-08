/**
 * File: api/llm/batch/[id]/executions/route.ts
 * Purpose: Get executions for a specific batch
 * Fix: F-03 — UI fetches /batch/:id/executions via RESTful path
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';
import { fileStorage } from '@/lib/storage/file-storage';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    const { id } = await params;
    const batch = await fileStorage.getBatch(id);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const executions = await fileStorage.getBatchExecutions(id);
    return NextResponse.json({ executions });
  } catch (error) {
    return apiError('Failed to get batch executions', 500, error);
  }
}
