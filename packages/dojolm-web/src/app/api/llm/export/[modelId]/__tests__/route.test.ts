/**
 * File: api/llm/export/[modelId]/__tests__/route.test.ts
 * Purpose: Tests for per-model export API (GET, OPTIONS)
 * Test IDs: EXPORT-001 through EXPORT-013
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockCheckApiAuth } = vi.hoisted(() => ({
  mockCheckApiAuth: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: mockCheckApiAuth,
}));

const { mockFileStorage } = vi.hoisted(() => ({
  mockFileStorage: {
    queryExecutions: vi.fn(),
    getModelConfigs: vi.fn(),
  },
}));

vi.mock('@/lib/storage/file-storage', () => ({
  fileStorage: mockFileStorage,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, OPTIONS } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:42001/api/llm/export/model-1';

function getRequest(modelId: string, params?: Record<string, string>): NextRequest {
  const url = new URL(`http://localhost:42001/api/llm/export/${modelId}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function makeParams(modelId: string): { params: Promise<{ modelId: string }> } {
  return { params: Promise.resolve({ modelId }) };
}

const mockExecution = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'exec-1',
  modelConfigId: 'model-1',
  testCaseId: 'tc-1',
  status: 'completed',
  resilienceScore: 80,
  injectionSuccess: 0.2,
  harmfulness: 0.1,
  duration_ms: 500,
  categoriesPassed: ['cat-a'],
  categoriesFailed: ['cat-b'],
  timestamp: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

const mockModel = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'model-1',
  name: 'Test Model',
  provider: 'openai',
  enabled: true,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Reset mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckApiAuth.mockReturnValue(null);
  mockFileStorage.queryExecutions.mockResolvedValue({
    executions: [mockExecution()],
  });
  mockFileStorage.getModelConfigs.mockResolvedValue([mockModel()]);
});

// ===========================================================================
// OPTIONS
// ===========================================================================

describe('OPTIONS /api/llm/export/[modelId]', () => {
  it('EXPORT-001: returns 204 with Allow header', () => {
    const req = new NextRequest(BASE_URL, { method: 'OPTIONS' });
    const res = OPTIONS(req);

    expect(res.status).toBe(204);
    expect(res.headers.get('Allow')).toBe('GET, OPTIONS');
  });
});

// ===========================================================================
// GET /api/llm/export/[modelId]
// ===========================================================================

describe('GET /api/llm/export/[modelId]', () => {
  it('EXPORT-002: unauthenticated request returns 401', async () => {
    const { NextResponse } = await import('next/server');
    mockCheckApiAuth.mockReturnValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    );

    const res = await GET(getRequest('model-1'), makeParams('model-1'));

    expect(res.status).toBe(401);
  });

  it('EXPORT-003: invalid modelId format returns 400', async () => {
    const res = await GET(
      getRequest('model;DROP TABLE'),
      makeParams('model;DROP TABLE')
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Invalid model ID format/);
  });

  it('EXPORT-004: unsupported format returns 400', async () => {
    const res = await GET(
      getRequest('model-1', { format: 'xml' }),
      makeParams('model-1')
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Unsupported format/);
  });

  it('EXPORT-005: no executions for model returns 404', async () => {
    mockFileStorage.queryExecutions.mockResolvedValue({
      executions: [mockExecution({ modelConfigId: 'other-model' })],
    });

    const res = await GET(getRequest('model-1'), makeParams('model-1'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/No executions found/);
  });

  it('EXPORT-006: JSON export returns model data with Content-Disposition', async () => {
    const res = await GET(getRequest('model-1'), makeParams('model-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.modelId).toBe('model-1');
    expect(data.modelName).toBe('Test Model');
    expect(data.provider).toBe('openai');
    expect(data.executions).toHaveLength(1);
    expect(data.exportedAt).toBeDefined();
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment/);
  });

  it('EXPORT-007: CSV export returns text/csv content type', async () => {
    const res = await GET(
      getRequest('model-1', { format: 'csv' }),
      makeParams('model-1')
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toMatch(/\.csv/);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');

    const body = await res.text();
    expect(body).toContain('Model');
    expect(body).toContain('Test Model');
  });

  it('EXPORT-008: SARIF export returns valid SARIF structure', async () => {
    const res = await GET(
      getRequest('model-1', { format: 'sarif' }),
      makeParams('model-1')
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.version).toBe('2.1.0');
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0].tool.driver.name).toContain('NODA');
    expect(res.headers.get('Content-Disposition')).toMatch(/\.sarif\.json/);
  });

  it('EXPORT-009: markdown export returns text/markdown content type', async () => {
    const res = await GET(
      getRequest('model-1', { format: 'markdown' }),
      makeParams('model-1')
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/markdown');

    const body = await res.text();
    expect(body).toContain('# LLM Security Report');
    expect(body).toContain('Test Model');
  });

  it('EXPORT-010: default format is json when not specified', async () => {
    const res = await GET(getRequest('model-1'), makeParams('model-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.modelId).toBe('model-1');
    expect(data.executions).toBeDefined();
  });

  it('EXPORT-011: storage error returns 500', async () => {
    mockFileStorage.queryExecutions.mockRejectedValue(new Error('Storage failure'));

    const res = await GET(getRequest('model-1'), makeParams('model-1'));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/Export failed/);
  });

  it('EXPORT-012: CSV escapes formula injection characters', async () => {
    mockFileStorage.queryExecutions.mockResolvedValue({
      executions: [mockExecution({ testCaseId: '=CMD()' })],
    });

    const res = await GET(
      getRequest('model-1', { format: 'csv' }),
      makeParams('model-1')
    );
    const body = await res.text();

    // Formula prefix should be escaped with a leading apostrophe
    expect(body).not.toMatch(/^=CMD/m);
  });

  it('EXPORT-013: avgResilienceScore is 0 when no completed executions', async () => {
    mockFileStorage.queryExecutions.mockResolvedValue({
      executions: [mockExecution({ status: 'failed' })],
    });

    const res = await GET(getRequest('model-1'), makeParams('model-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.avgResilienceScore).toBe(0);
  });
});
