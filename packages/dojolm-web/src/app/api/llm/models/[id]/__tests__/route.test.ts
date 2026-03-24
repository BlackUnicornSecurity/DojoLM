/**
 * File: api/llm/models/[id]/__tests__/route.test.ts
 * Tests: GET, PATCH, DELETE /api/llm/models/[id]
 * IDs: MID-001 through MID-017
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    getModelConfig: vi.fn(),
    saveModelConfig: vi.fn(),
    deleteModelConfig: vi.fn(),
  },
}));

vi.mock('@/lib/storage/storage-interface', () => ({
  getStorage: vi.fn().mockResolvedValue(mockStorage),
}));

vi.mock('@/lib/llm-providers', () => ({
  validateModelConfig: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, PATCH, DELETE } from '../route';
import { checkApiAuth } from '@/lib/api-auth';
import { validateModelConfig } from '@/lib/llm-providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown): NextRequest {
  const url = 'http://localhost:42001/api/llm/models/test-id';
  if (body !== undefined) {
    return new NextRequest(url, {
      method,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new NextRequest(url, { method });
}

function makeBadJsonRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/models/test-id', {
    method: 'PATCH',
    body: '{{invalid json',
    headers: { 'Content-Type': 'application/json' },
  });
}

const SAMPLE_MODEL = {
  id: 'test-id',
  name: 'GPT-4',
  description: 'OpenAI GPT-4',
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'sk-secret-key-12345',
  baseUrl: 'https://api.openai.com/v1',
  enabled: true,
  maxTokens: 4096,
  temperature: 0.7,
  topP: 1,
  customHeaders: {},
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('API /api/llm/models/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkApiAuth as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (validateModelConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      valid: true,
      errors: [],
    });
  });

  // =========================================================================
  // GET
  // =========================================================================

  describe('GET', () => {
    it('MID-001: returns model with apiKey stripped', async () => {
      mockStorage.getModelConfig.mockResolvedValue({ ...SAMPLE_MODEL });

      const res = await GET(makeRequest('GET'), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.model).toBeDefined();
      expect(data.model.name).toBe('GPT-4');
      expect(data.model.apiKey).toBeUndefined();
      expect(data.model.id).toBe('test-id');
    });

    it('MID-002: returns 404 when model not found', async () => {
      mockStorage.getModelConfig.mockResolvedValue(null);

      const res = await GET(makeRequest('GET'), createParams('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Model not found');
    });

    it('MID-003: returns auth error when checkApiAuth fails', async () => {
      const authResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      (checkApiAuth as ReturnType<typeof vi.fn>).mockReturnValue(authResponse);

      const res = await GET(makeRequest('GET'), createParams('test-id'));

      expect(res.status).toBe(401);
      expect(mockStorage.getModelConfig).not.toHaveBeenCalled();
    });

    it('MID-004: returns 500 on internal error', async () => {
      mockStorage.getModelConfig.mockRejectedValue(new Error('DB down'));

      const res = await GET(makeRequest('GET'), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to get model');
    });
  });

  // =========================================================================
  // PATCH
  // =========================================================================

  describe('PATCH', () => {
    it('MID-005: updates allowed fields', async () => {
      mockStorage.getModelConfig.mockResolvedValue({ ...SAMPLE_MODEL });
      mockStorage.saveModelConfig.mockImplementation(async (m) => m);

      const body = { name: 'GPT-4 Turbo', description: 'Updated', maxTokens: 8192 };
      const res = await PATCH(makeRequest('PATCH', body), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.model.name).toBe('GPT-4 Turbo');
      expect(data.model.description).toBe('Updated');
      expect(data.model.maxTokens).toBe(8192);
    });

    it('MID-006: rejects non-allowlisted fields (mass-assignment prevention)', async () => {
      mockStorage.getModelConfig.mockResolvedValue({ ...SAMPLE_MODEL });
      mockStorage.saveModelConfig.mockImplementation(async (m) => m);

      const body = { name: 'Hacked', apiKey: 'sk-evil', provider: 'evil-provider', role: 'admin' };
      const res = await PATCH(makeRequest('PATCH', body), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.model.name).toBe('Hacked');
      // Non-allowlisted fields must NOT be in the saved config
      const savedArg = mockStorage.saveModelConfig.mock.calls[0][0];
      expect(savedArg.apiKey).toBe('sk-secret-key-12345'); // preserved from original
      expect(savedArg.provider).toBe('openai'); // preserved from original
      expect(savedArg.role).toBeUndefined(); // never existed
    });

    it('MID-007: returns 400 for invalid JSON body', async () => {
      const res = await PATCH(makeBadJsonRequest(), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('returns 400 for null PATCH body', async () => {
      const res = await PATCH(makeRequest('PATCH', null), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Request body must be a JSON object');
    });

    it('MID-008: returns 404 when model not found', async () => {
      mockStorage.getModelConfig.mockResolvedValue(null);

      const body = { name: 'Update' };
      const res = await PATCH(makeRequest('PATCH', body), createParams('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Model not found');
    });

    it('MID-009: preserves id and createdAt from existing model', async () => {
      const original = { ...SAMPLE_MODEL, createdAt: '2024-06-15T12:00:00.000Z' };
      mockStorage.getModelConfig.mockResolvedValue(original);
      mockStorage.saveModelConfig.mockImplementation(async (m) => m);

      const body = { name: 'New Name', id: 'hijacked-id', createdAt: '1999-01-01T00:00:00.000Z' };
      const res = await PATCH(makeRequest('PATCH', body), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(200);
      // id and createdAt should be from original, not from body
      const savedArg = mockStorage.saveModelConfig.mock.calls[0][0];
      expect(savedArg.id).toBe('test-id');
      expect(savedArg.createdAt).toBe('2024-06-15T12:00:00.000Z');
      expect(data.model.id).toBe('test-id');
      expect(data.model.createdAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('MID-010: sets updatedAt to current time', async () => {
      const before = new Date().toISOString();
      mockStorage.getModelConfig.mockResolvedValue({ ...SAMPLE_MODEL });
      mockStorage.saveModelConfig.mockImplementation(async (m) => m);

      const body = { name: 'Timestamp Test' };
      const res = await PATCH(makeRequest('PATCH', body), createParams('test-id'));
      const data = await res.json();
      const after = new Date().toISOString();

      expect(res.status).toBe(200);
      expect(data.model.updatedAt).toBeDefined();
      expect(data.model.updatedAt >= before).toBe(true);
      expect(data.model.updatedAt <= after).toBe(true);
    });

    it('MID-011: strips apiKey from PATCH response', async () => {
      const modelWithKey = { ...SAMPLE_MODEL, apiKey: 'sk-super-secret' };
      mockStorage.getModelConfig.mockResolvedValue(modelWithKey);
      mockStorage.saveModelConfig.mockImplementation(async (m) => m);

      const body = { name: 'Strip Test' };
      const res = await PATCH(makeRequest('PATCH', body), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.model.apiKey).toBeUndefined();
      expect(data.model.name).toBe('Strip Test');
    });

    it('sanitizes string fields before saving', async () => {
      mockStorage.getModelConfig.mockResolvedValue({ ...SAMPLE_MODEL });
      mockStorage.saveModelConfig.mockImplementation(async (m) => m);

      const res = await PATCH(
        makeRequest('PATCH', { name: '<b>Safe Name</b>', model: ' gpt-4 ' }),
        createParams('test-id'),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.model.name).toBe('Safe Name');
      expect(data.model.model).toBe('gpt-4');
    });

    it('returns 400 when updated model validation fails', async () => {
      mockStorage.getModelConfig.mockResolvedValue({ ...SAMPLE_MODEL });
      (validateModelConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
        valid: false,
        errors: ['Temperature must be between 0 and 2'],
      });

      const res = await PATCH(makeRequest('PATCH', { temperature: 9 }), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid model configuration');
      expect(data.errors).toContain('Temperature must be between 0 and 2');
      expect(mockStorage.saveModelConfig).not.toHaveBeenCalled();
    });

    it('MID-012: returns auth error when checkApiAuth fails', async () => {
      const authResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      (checkApiAuth as ReturnType<typeof vi.fn>).mockReturnValue(authResponse);

      const body = { name: 'No Auth' };
      const res = await PATCH(makeRequest('PATCH', body), createParams('test-id'));

      expect(res.status).toBe(401);
      expect(mockStorage.getModelConfig).not.toHaveBeenCalled();
      expect(mockStorage.saveModelConfig).not.toHaveBeenCalled();
    });

    it('MID-013: returns 500 on internal error', async () => {
      mockStorage.getModelConfig.mockResolvedValue({ ...SAMPLE_MODEL });
      mockStorage.saveModelConfig.mockRejectedValue(new Error('Write failed'));

      const body = { name: 'Error Test' };
      const res = await PATCH(makeRequest('PATCH', body), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to update model');
    });
  });

  // =========================================================================
  // DELETE
  // =========================================================================

  describe('DELETE', () => {
    it('MID-014: successfully deletes a model', async () => {
      mockStorage.deleteModelConfig.mockResolvedValue(true);

      const res = await DELETE(makeRequest('DELETE'), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockStorage.deleteModelConfig).toHaveBeenCalledWith('test-id');
    });

    it('MID-015: returns 404 when model not found for deletion', async () => {
      mockStorage.deleteModelConfig.mockResolvedValue(false);

      const res = await DELETE(makeRequest('DELETE'), createParams('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Model not found');
    });

    it('MID-016: returns auth error when checkApiAuth fails', async () => {
      const authResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      (checkApiAuth as ReturnType<typeof vi.fn>).mockReturnValue(authResponse);

      const res = await DELETE(makeRequest('DELETE'), createParams('test-id'));

      expect(res.status).toBe(401);
      expect(mockStorage.deleteModelConfig).not.toHaveBeenCalled();
    });

    it('MID-017: returns 500 on internal error', async () => {
      mockStorage.deleteModelConfig.mockRejectedValue(new Error('FS error'));

      const res = await DELETE(makeRequest('DELETE'), createParams('test-id'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to delete model');
    });
  });
});
