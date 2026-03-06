/**
 * File: api/llm/models/route.ts
 * Purpose: Model configuration CRUD API
 * Methods:
 * - GET: List all model configurations
 * - POST: Create a new model configuration
 * - DELETE: Delete a model configuration
 * - PATCH: Enable/disable a model
 */

import { NextRequest, NextResponse } from 'next/server';

import type { LLMModelConfig } from '@/lib/llm-types';
import { fileStorage } from '@/lib/storage/file-storage';
import { validateModelConfig } from '@/lib/llm-providers';
import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';

// ===========================================================================
// GET /api/llm/models - List all models
// ===========================================================================

export async function GET(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);

    // Filter by provider if specified
    const provider = searchParams.get('provider');
    const enabled = searchParams.get('enabled');

    let models = await fileStorage.getModelConfigs();

    // Apply filters
    if (provider) {
      models = models.filter(m => m.provider === provider);
    }

    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      models = models.filter(m => m.enabled === isEnabled);
    }

    // S-01: Redact API keys before returning (CRITICAL — keys were exposed to LAN)
    const safeModels = models.map(({ apiKey: _key, ...safe }) => safe);

    return NextResponse.json(safeModels);
  } catch (error) {
    return apiError('Failed to list models', 500, error);
  }
}

// ===========================================================================
// POST /api/llm/models - Create a new model
// ===========================================================================

export async function POST(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { name, provider, model, apiKey, baseUrl } = body;

    if (!name || !provider || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: name, provider, model are required' },
        { status: 400 }
      );
    }

    // Create model config
    const now = new Date().toISOString();
    const id = `model-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const newModel: LLMModelConfig = {
      id,
      name: name as string,
      provider: provider as LLMModelConfig['provider'],
      model: model as string,
      apiKey: apiKey as string | undefined,
      baseUrl: baseUrl as string | undefined,
      enabled: (body.enabled as boolean) ?? true,
      maxTokens: body.maxTokens as number | undefined,
      organizationId: body.organizationId as string | undefined,
      projectId: body.projectId as string | undefined,
      customHeaders: body.customHeaders as Record<string, string> | undefined,
      temperature: body.temperature as number | undefined,
      topP: body.topP as number | undefined,
      createdAt: now,
      updatedAt: now,
    };

    // Validate config
    const validation = await validateModelConfig(newModel);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid model configuration', errors: validation.errors },
        { status: 400 }
      );
    }

    // Save model
    const saved = await fileStorage.saveModelConfig(newModel);

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002)
    const { apiKey: _savedKey, ...safeCreated } = saved;
    return NextResponse.json({ model: safeCreated }, { status: 201 });
  } catch (error) {
    return apiError('Failed to create model', 500, error);
  }
}

// ===========================================================================
// DELETE /api/llm/models - Delete a model
// ===========================================================================

export async function DELETE(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const success = await fileStorage.deleteModelConfig(id);

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

// ===========================================================================
// PATCH /api/llm/models - Update a model
// ===========================================================================

export async function PATCH(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    // Get existing model
    const existing = await fileStorage.getModelConfig(id as string);

    if (!existing) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // H-01: Apply PATCHABLE whitelist to prevent mass assignment (match [id]/route.ts pattern)
    const PATCHABLE = ['name', 'description', 'enabled', 'maxTokens', 'temperature', 'topP', 'customHeaders', 'baseUrl', 'model'] as const;
    const patch: Record<string, unknown> = {};
    for (const key of PATCHABLE) {
      if (key in body) patch[key] = body[key];
    }

    const updated: LLMModelConfig = {
      ...existing,
      ...patch,
      id: id as string, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: new Date().toISOString(),
    };

    // Validate updated config
    const validation = await validateModelConfig(updated);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid model configuration', errors: validation.errors },
        { status: 400 }
      );
    }

    // Save updated model
    const saved = await fileStorage.saveModelConfig(updated);

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002)
    const { apiKey: _patchKey, ...safePatch } = saved;
    return NextResponse.json({ model: safePatch });
  } catch (error) {
    return apiError('Failed to update model', 500, error);
  }
}
