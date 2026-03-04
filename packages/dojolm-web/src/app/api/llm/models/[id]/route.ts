/**
 * File: api/llm/models/[id]/route.ts
 * Purpose: Individual model operations
 * Methods:
 * - PATCH: Update a specific model
 * - DELETE: Delete a specific model
 * - GET: Get a specific model
 */

import { NextRequest, NextResponse } from 'next/server';

import type { LLMModelConfig } from '@/lib/llm-types';
import { fileStorage } from '@/lib/storage/file-storage';
import { testModelConfig } from '@/lib/llm-providers';

// ===========================================================================
// GET /api/llm/models/[id] - Get a specific model
// ===========================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const model = await fileStorage.getModelConfig(id);

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Strip sensitive fields before returning
    const { apiKey: _key, ...safeModel } = model as unknown as Record<string, unknown>;
    return NextResponse.json(safeModel);
  } catch (error) {
    console.error('Error getting model:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ===========================================================================
// PATCH /api/llm/models/[id] - Update a specific model
// ===========================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get existing model
    const existing = await fileStorage.getModelConfig(id);

    if (!existing) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Apply updates - allowlist only safe fields to prevent mass-assignment
    const PATCHABLE = ['name', 'description', 'enabled', 'maxTokens', 'temperature', 'topP', 'customHeaders'] as const;
    const patch: Record<string, unknown> = {};
    for (const key of PATCHABLE) {
      if (key in body) patch[key] = body[key];
    }

    const updated: LLMModelConfig = {
      ...existing,
      ...patch,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    // Save updated model
    const saved = await fileStorage.saveModelConfig(updated);

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

// ===========================================================================
// DELETE /api/llm/models/[id] - Delete a specific model
// ===========================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const success = await fileStorage.deleteModelConfig(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}
