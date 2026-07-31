// SPDX-License-Identifier: Apache-2.0
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
import { withAuth } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';
import { getSenseiBrainId } from '@/lib/llm/target-models';

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

export const GET = withAuth(
  async (request: NextRequest, { params }) => {
  const id = params?.id ?? '';
  if (isDemoMode()) return demoModelById(id);

  try {
    const { searchParams } = new URL(request.url);

    // Sensei Rework (Pillar B) — the brain is hidden from individual reads
    // exactly as it is from the target list (`/api/llm/models`). Management
    // and Sensei-picker surfaces opt in via `?includeBrain=true` /
    // `?senseiOnly=true`; everyone else gets a 404 when naming the brain id —
    // indistinguishable from an unknown id — so an admin who guesses the
    // brain id cannot retrieve its model/baseUrl config (F-QA-030).
    const senseiOnly = searchParams.get('senseiOnly') === 'true';
    const includeBrain = senseiOnly || searchParams.get('includeBrain') === 'true';

    if (!includeBrain && id === getSenseiBrainId()) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

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
  },
  { role: 'admin' },
);

// ===========================================================================
// PATCH /api/llm/models/[id] - Update a specific model
// ===========================================================================

export const PATCH = withAuth(
  async (request: NextRequest, { params }) => {
  if (isDemoMode()) return demoNoOp();

  try {
    const id = params?.id ?? '';
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

    void auditLog.modelConfigChange({
      endpoint: `/api/llm/models/${id}`,
      user: 'admin',
      modelId: id,
      operation: 'enabled' in patch ? 'toggle' : 'update',
    });

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002)
    return NextResponse.json({ model: toSafeModelResponse(saved) });
  } catch (error) {
    return apiError('Failed to update model', 500, error);
  }
  },
  { role: 'admin' },
);

// ===========================================================================
// DELETE /api/llm/models/[id] - Delete a specific model
// ===========================================================================

export const DELETE = withAuth(
  async (_request: NextRequest, { params }) => {
  if (isDemoMode()) return demoNoOp();

  try {
    const id = params?.id ?? '';
    const storage = await getStorage();

    const success = await storage.deleteModelConfig(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    void auditLog.modelConfigChange({
      endpoint: `/api/llm/models/${id}`,
      user: 'admin',
      modelId: id,
      operation: 'delete',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError('Failed to delete model', 500, error);
  }
  },
  { role: 'admin' },
);
