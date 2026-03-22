/**
 * File: llm/models/route.test.ts
 * Purpose: Tests for GET/POST/DELETE/PATCH /api/llm/models
 * Coverage: API-L-001 to API-L-006
 * Source: src/app/api/llm/models/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock file storage
vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: {
    getModelConfigs: vi.fn().mockResolvedValue([
      {
        id: 'model-1',
        name: 'Test GPT-4',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-secret-key-12345',
        enabled: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'model-2',
        name: 'Test Claude',
        provider: 'anthropic',
        model: 'claude-3',
        apiKey: 'sk-ant-secret',
        enabled: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]),
    getModelConfig: vi.fn().mockResolvedValue({
      id: 'model-1',
      name: 'Test GPT-4',
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'sk-secret-key-12345',
      enabled: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }),
    saveModelConfig: vi.fn().mockImplementation(async (config: Record<string, unknown>) => config),
    deleteModelConfig: vi.fn().mockResolvedValue(true),
  },
}));

// Mock llm-providers
vi.mock('@/lib/llm-providers', () => ({
  validateModelConfig: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
}));

// Mock api-error
vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

// Mock api-auth
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

describe('API /api/llm/models', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/llm/models', () => {
    // API-L-001: List all models
    it('API-L-001: returns model list with API keys redacted', async () => {
      const { GET } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
      // API keys must be redacted
      for (const model of body) {
        expect(model).not.toHaveProperty('apiKey');
      }
    });

    // API-L-001b: Filter by provider
    it('API-L-001b: filters models by provider', async () => {
      const { GET } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models?provider=openai');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.every((m: Record<string, unknown>) => m.provider === 'openai')).toBe(true);
    });

    // API-L-001c: Filter by enabled status
    it('API-L-001c: filters models by enabled status', async () => {
      const { GET } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models?enabled=true');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.every((m: Record<string, unknown>) => m.enabled === true)).toBe(true);
    });
  });

  describe('POST /api/llm/models', () => {
    // API-L-002: Create new model
    it('API-L-002: creates a new model config', async () => {
      const { POST } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'New Model',
          provider: 'openai',
          model: 'gpt-4-turbo',
          apiKey: 'sk-test-key',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.model).toHaveProperty('name', 'New Model');
      // API key must be redacted from response
      expect(body.model).not.toHaveProperty('apiKey');
    });

    // API-L-003: Reject missing required fields
    it('API-L-003: rejects model creation with missing fields', async () => {
      const { POST } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Incomplete Model' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('required');
    });

    // API-L-003b: Reject HTML injection in name (BUG-033)
    it('API-L-003b: sanitizes HTML tags from string fields', async () => {
      const { POST } = await import('@/app/api/llm/models/route');
      const { fileStorage } = await import('@/lib/storage/file-storage');

      const req = new NextRequest('http://localhost:42001/api/llm/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: '<script>alert(1)</script>Model',
          provider: 'openai',
          model: 'gpt-4',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      // Verify the saved config has sanitized name
      const savedCall = vi.mocked(fileStorage.saveModelConfig).mock.calls[0][0];
      expect(savedCall.name).not.toContain('<script>');
      expect(savedCall.name).toBe('alert(1)Model');
    });

    // API-L-003c: Reject null JSON body (BUG-035)
    it('API-L-003c: rejects null JSON body', async () => {
      const { POST } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'null',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/llm/models', () => {
    // API-L-006: Delete model
    it('API-L-006: deletes an existing model', async () => {
      const { DELETE } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models?id=model-1', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
    });

    // API-L-006b: Delete non-existent model returns 404
    it('API-L-006b: returns 404 for non-existent model', async () => {
      const { fileStorage } = await import('@/lib/storage/file-storage');
      vi.mocked(fileStorage.deleteModelConfig).mockResolvedValueOnce(false);

      const { DELETE } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models?id=non-existent', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(404);
    });

    // API-L-006c: Delete without ID returns 400
    it('API-L-006c: rejects delete without model ID', async () => {
      const { DELETE } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/llm/models', () => {
    // API-L-005: Update model
    it('API-L-005: updates an existing model', async () => {
      const { PATCH } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: 'model-1',
          name: 'Updated Name',
          enabled: false,
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.model).not.toHaveProperty('apiKey');
    });

    // API-L-005b: PATCH rejects non-existent model
    it('API-L-005b: returns 404 for non-existent model', async () => {
      const { fileStorage } = await import('@/lib/storage/file-storage');
      vi.mocked(fileStorage.getModelConfig).mockResolvedValueOnce(null);

      const { PATCH } = await import('@/app/api/llm/models/route');

      const req = new NextRequest('http://localhost:42001/api/llm/models', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: 'non-existent',
          name: 'Updated',
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(404);
    });
  });
});
