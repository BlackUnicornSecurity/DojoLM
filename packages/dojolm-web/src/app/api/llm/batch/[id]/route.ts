/**
 * File: api/llm/batch/[id]/route.ts
 * Purpose: Individual batch operations (GET, PATCH, DELETE)
 * Fix: F-03 — UI sends RESTful path params, not query params
 * Index:
 * - GET handler (line 13) — Get single batch by ID
 * - PATCH handler (line 37) — Cancel a running batch
 * - DELETE handler (line 62) — Delete a batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';
import { fileStorage } from '@/lib/storage/file-storage';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/llm/batch/:id — Get batch details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    const { id } = await params;
    const batch = await fileStorage.getBatch(id);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (error) {
    return apiError('Failed to get batch', 500, error);
  }
}

// PATCH /api/llm/batch/:id — Cancel a running batch
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const batch = await fileStorage.getBatch(id);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (body.status === 'cancelled' && batch.status === 'running') {
      const updated = await fileStorage.updateBatch(id, { status: 'cancelled' });
      return NextResponse.json({ batch: updated });
    }

    return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
  } catch (error) {
    return apiError('Failed to update batch', 500, error);
  }
}

// DELETE /api/llm/batch/:id — Delete a batch
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    const { id } = await params;
    const success = await fileStorage.deleteBatch(id);

    if (!success) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError('Failed to delete batch', 500, error);
  }
}
