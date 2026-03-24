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
import { getStorage } from '@/lib/storage/storage-interface';
import { validateModelConfig } from '@/lib/llm-providers';
import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';

/**
 * Strip HTML tags and control characters from user-supplied strings.
 * Defense-in-depth against stored XSS (BUG-033).
 */
function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars (preserve \t \n \r)
    .trim();
}

function toSafeModelResponse(model: LLMModelConfig) {
  const { apiKey: _apiKey, customHeaders: _customHeaders, ...safeModel } = model;
  return safeModel;
}

// ===========================================================================
// GET /api/llm/models - List all models
// ===========================================================================

export async function GET(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const storage = await getStorage();

    // Filter by provider if specified
    const provider = searchParams.get('provider');
    const enabled = searchParams.get('enabled');

    let models = await storage.getModelConfigs();

    // Apply filters
    if (provider) {
      models = models.filter(m => m.provider === provider);
    }

    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      models = models.filter(m => m.enabled === isEnabled);
    }

    // S-01: Redact API keys before returning (CRITICAL — keys were exposed to LAN)
    const safeModels = models.map(toSafeModelResponse);

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

    // BUG-035: Guard against null/non-object body (null is valid JSON)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
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

    // Sanitize string inputs (BUG-033: prevent stored XSS)
    const safeName = sanitizeString(name);
    const safeProvider = sanitizeString(provider);
    const safeModel = sanitizeString(model);
    const safeBaseUrl = baseUrl ? sanitizeString(baseUrl) : undefined;

    // BUG-036: Enforce field length limits
    const FIELD_LIMITS = { name: 200, provider: 100, model: 200, baseUrl: 500 } as const;
    if (safeName.length > FIELD_LIMITS.name || safeProvider.length > FIELD_LIMITS.provider ||
        safeModel.length > FIELD_LIMITS.model || (safeBaseUrl && safeBaseUrl.length > FIELD_LIMITS.baseUrl)) {
      return NextResponse.json(
        { error: `Field length exceeded: name max ${FIELD_LIMITS.name}, provider max ${FIELD_LIMITS.provider}, model max ${FIELD_LIMITS.model}, baseUrl max ${FIELD_LIMITS.baseUrl}` },
        { status: 400 }
      );
    }

    if (!safeName || !safeProvider || !safeModel) {
      return NextResponse.json(
        { error: 'Invalid input: name, provider, and model must contain non-tag text' },
        { status: 400 }
      );
    }

    // Create model config
    const now = new Date().toISOString();
    const id = `model-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const newModel: LLMModelConfig = {
      id,
      name: safeName,
      provider: safeProvider as LLMModelConfig['provider'],
      model: safeModel,
      apiKey: apiKey as string | undefined,
      baseUrl: safeBaseUrl,
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
    const storage = await getStorage();
    const saved = await storage.saveModelConfig(newModel);

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002)
    return NextResponse.json({ model: toSafeModelResponse(saved) }, { status: 201 });
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
    // BUG-035: Guard against null/non-object body (null is valid JSON)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
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
    const storage = await getStorage();
    const existing = await storage.getModelConfig(id as string);

    if (!existing) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // H-01: Apply PATCHABLE whitelist to prevent mass assignment (match [id]/route.ts pattern)
    const PATCHABLE = ['name', 'description', 'enabled', 'maxTokens', 'temperature', 'topP', 'customHeaders', 'baseUrl', 'model', 'safetyRisk', 'requiresGuard'] as const;
    const STRING_FIELDS = new Set(['name', 'description', 'baseUrl', 'model']);
    const patch: Record<string, unknown> = {};
    for (const key of PATCHABLE) {
      if (key in body) {
        // BUG-033: Sanitize string fields to prevent stored XSS
        patch[key] = STRING_FIELDS.has(key) ? sanitizeString(body[key]) : body[key];
      }
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
    const saved = await storage.saveModelConfig(updated);

    // Redact API key from response — wrap in { model } to match frontend expectations (BUG-002)
    return NextResponse.json({ model: toSafeModelResponse(saved) });
  } catch (error) {
    return apiError('Failed to update model', 500, error);
  }
}
