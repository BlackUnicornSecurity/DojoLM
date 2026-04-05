/**
 * File: api/llm/models/[id]/route.ts
 * Purpose: Individual model operations
 * Methods:
 * - PATCH: Update a specific model
 * - DELETE: Delete a specific model
 * - GET: Get a specific model
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoModelById, demoNoOp } from '@/lib/demo/mock-api-handlers';

import type { LLMModelConfig } from '@/lib/llm-types';
import { getStorage } from '@/lib/storage/storage-interface';
import { validateModelConfig } from '@/lib/llm-providers';
import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';

function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

function toSafeModelResponse(model: LLMModelConfig) {
  const { apiKey: _apiKey, customHeaders: _customHeaders, ...safeModel } = model;
  return safeModel;
}

// ===========================================================================
// GET /api/llm/models/[id] - Get a specific model
// ===========================================================================

export function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, PATCH, DELETE, OPTIONS' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (isDemoMode()) return demoModelById(id);

  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const storage = await getStorage();

    const model = await storage.getModelConfig(id);

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Strip sensitive fields before returning
    return NextResponse.json({ model: toSafeModelResponse(model) });
  } catch (error) {
    return apiError('Failed to get model', 500, error);
  }
}

// ===========================================================================
// PATCH /api/llm/models/[id] - Update a specific model
// ===========================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isDemoMode()) return demoNoOp();

  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { id } = await params;
    const storage = await getStorage();
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    // Get existing model
    const existing = await storage.getModelConfig(id);

    if (!existing) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Apply updates - allowlist only safe fields to prevent mass-assignment
    const PATCHABLE = ['name', 'description', 'enabled', 'maxTokens', 'temperature', 'topP', 'customHeaders', 'baseUrl', 'model', 'requestTimeout'] as const;
    const STRING_FIELDS = new Set(['name', 'description', 'baseUrl', 'model']);
    const patch: Record<string, unknown> = {};
    for (const key of PATCHABLE) {
      if (key in body) {
        patch[key] = STRING_FIELDS.has(key) ? sanitizeString(body[key]) : body[key];
      }
    }

    const updated: LLMModelConfig = {
      ...existing,
      ...patch,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const validation = await validateModelConfig(updated);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid model configuration', errors: validation.errors },
        { status: 400 }
      );
    }

    // Save updated model
    const saved = await storage.saveModelConfig(updated);

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002)
    return NextResponse.json({ model: toSafeModelResponse(saved) });
  } catch (error) {
    return apiError('Failed to update model', 500, error);
  }
}

// ===========================================================================
// DELETE /api/llm/models/[id] - Delete a specific model
// ===========================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isDemoMode()) return demoNoOp();

  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { id } = await params;
    const storage = await getStorage();

    const success = await storage.deleteModelConfig(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError('Failed to delete model', 500, error);
  }
}
