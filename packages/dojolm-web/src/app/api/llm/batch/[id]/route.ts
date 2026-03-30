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
import { withAuth } from '@/lib/auth/route-guard';
import { fileStorage } from '@/lib/storage/file-storage';

type RouteParams = { params?: Record<string, string> };

// GET /api/llm/batch/:id — Get batch details
export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const id = params?.['id'];
    if (!id) {
      return NextResponse.json({ error: 'Missing batch id' }, { status: 400 });
    }
    const batch = await fileStorage.getBatch(id);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (error) {
    return apiError('Failed to get batch', 500, error);
  }
}, { resource: 'batches', action: 'read' });

// PATCH /api/llm/batch/:id — Cancel a running batch
export const PATCH = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const id = params?.['id'];
    if (!id) {
      return NextResponse.json({ error: 'Missing batch id' }, { status: 400 });
    }

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
}, { resource: 'batches', action: 'execute' });

// DELETE /api/llm/batch/:id — Delete a batch
export const DELETE = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const id = params?.['id'];
    if (!id) {
      return NextResponse.json({ error: 'Missing batch id' }, { status: 400 });
    }
    const success = await fileStorage.deleteBatch(id);

    if (!success) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError('Failed to delete batch', 500, error);
  }
}, { resource: 'batches', action: 'delete' });
