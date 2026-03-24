/**
 * Sensei — Tool Executor Tests
 * SH3.4: Tests for executeToolCall, validateArgs, and sanitizeResult.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeToolCall,
  validateArgs,
  sanitizeResult,
} from '../tool-executor';
import type { SenseiToolDefinition } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_GET_TOOL: SenseiToolDefinition = {
  name: 'get_stats',
  description: 'Get scanner statistics.',
  parameters: { type: 'object', properties: {} },
  endpoint: '/api/stats',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const MOCK_POST_TOOL: SenseiToolDefinition = {
  name: 'scan_text',
  description: 'Scan text for threats.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to scan.' },
      engines: { type: 'array', description: 'Engines to use.' },
      mode: { type: 'string', enum: ['safe', 'full'], description: 'Execution mode.' },
    },
    required: ['text'],
  },
  endpoint: '/api/scan',
  method: 'POST',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'user',
};

const MOCK_CLIENT_TOOL: SenseiToolDefinition = {
  name: 'navigate_to',
  description: 'Navigate to a module.',
  parameters: {
    type: 'object',
    properties: {
      module: { type: 'string', description: 'Module ID.' },
    },
    required: ['module'],
  },
  endpoint: '__client__',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const MOCK_EXPLAIN_TOOL: SenseiToolDefinition = {
  name: 'explain_feature',
  description: 'Explain a module.',
  parameters: {
    type: 'object',
    properties: {
      module: { type: 'string', description: 'Module ID.' },
    },
    required: ['module'],
  },
  endpoint: '__client__',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

function createMockRequest(url = 'http://localhost:42001/api/sensei/chat'): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'test-key',
    },
  });
}

// ---------------------------------------------------------------------------
// validateArgs
// ---------------------------------------------------------------------------

describe('validateArgs', () => {
  it('passes when all required fields are present', () => {
    const errors = validateArgs(MOCK_POST_TOOL, { text: 'hello' });
    expect(errors).toHaveLength(0);
  });

  it('reports missing required fields', () => {
    const errors = validateArgs(MOCK_POST_TOOL, {});
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('text');
    expect(errors[0].message).toContain('Required');
  });

  it('reports type mismatches', () => {
    const errors = validateArgs(MOCK_POST_TOOL, { text: 123 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('text');
    expect(errors[0].message).toContain('string');
  });

  it('passes when no required fields are defined and no args are provided', () => {
    const errors = validateArgs(MOCK_GET_TOOL, {});
    expect(errors).toHaveLength(0);
  });

  it('detects array type mismatch', () => {
    const errors = validateArgs(MOCK_POST_TOOL, {
      text: 'hello',
      engines: 'not-an-array',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('engines');
  });

  it('accepts correct array type', () => {
    const errors = validateArgs(MOCK_POST_TOOL, {
      text: 'hello',
      engines: ['engine1'],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects undeclared fields', () => {
    const errors = validateArgs(MOCK_POST_TOOL, {
      text: 'hello',
      unexpected: true,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('not allowed');
  });

  it('rejects enum violations', () => {
    const errors = validateArgs(MOCK_POST_TOOL, {
      text: 'hello',
      mode: 'turbo',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('must be one of');
  });
});

// ---------------------------------------------------------------------------
// sanitizeResult
// ---------------------------------------------------------------------------

describe('sanitizeResult', () => {
  it('masks API key fields', () => {
    const data = { apiKey: 'sk-secret-123', name: 'model-1' };
    const result = sanitizeResult(data) as Record<string, unknown>;
    expect(result.apiKey).toBe('***');
    expect(result.name).toBe('model-1');
  });

  it('masks nested secret fields', () => {
    const data = {
      config: { secretKey: 'my-secret', endpoint: 'http://test' },
    };
    const result = sanitizeResult(data) as Record<string, Record<string, unknown>>;
    expect(result.config.secretKey).toBe('***');
    expect(result.config.endpoint).toBe('http://test');
  });

  it('masks secrets inside arrays', () => {
    const data = [{ apiKey: 'secret1' }, { apiKey: 'secret2' }];
    const result = sanitizeResult(data) as Array<Record<string, unknown>>;
    expect(result[0].apiKey).toBe('***');
    expect(result[1].apiKey).toBe('***');
  });

  it('truncates results exceeding 4KB', () => {
    const data = { content: 'x'.repeat(5000) };
    const result = sanitizeResult(data) as Record<string, unknown>;
    expect(result._truncated).toBe(true);
    expect(result._originalSize).toBeGreaterThan(4096);
  });

  it('does not truncate results under 4KB', () => {
    const data = { status: 'ok', count: 5 };
    const result = sanitizeResult(data) as Record<string, unknown>;
    expect(result._truncated).toBeUndefined();
    expect(result.status).toBe('ok');
  });

  it('strips HTML from string values', () => {
    const data = { text: 'Hello <script>alert("xss")</script> World' };
    const result = sanitizeResult(data) as Record<string, unknown>;
    expect(result.text).toBe('Hello alert("xss") World');
  });

  it('handles null and undefined', () => {
    expect(sanitizeResult(null)).toBeNull();
    expect(sanitizeResult(undefined)).toBeUndefined();
  });

  it('masks all known secret field variants', () => {
    const data = {
      api_key: 's1',
      secret_key: 's2',
      password: 's3',
      token: 's4',
      accessToken: 's5',
      access_token: 's6',
      refreshToken: 's7',
      refresh_token: 's8',
    };
    const result = sanitizeResult(data) as Record<string, unknown>;
    for (const value of Object.values(result)) {
      expect(value).toBe('***');
    }
  });
});

// ---------------------------------------------------------------------------
// executeToolCall
// ---------------------------------------------------------------------------

describe('executeToolCall', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes a successful GET tool call', async () => {
    const mockResponse = new Response(
      JSON.stringify({ patternCount: 120, groupCount: 27 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    const request = createMockRequest();
    const result = await executeToolCall(MOCK_GET_TOOL, {}, request);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('get_stats');
    expect(result.data).toEqual({ patternCount: 120, groupCount: 27 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('executes a successful POST tool call', async () => {
    const mockResponse = new Response(
      JSON.stringify({ findings: [], verdict: 'ALLOW' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    const request = createMockRequest();
    const result = await executeToolCall(
      MOCK_POST_TOOL,
      { text: 'test input' },
      request,
    );

    expect(result.success).toBe(true);
    expect(result.tool).toBe('scan_text');
    const data = result.data as Record<string, unknown>;
    expect(data.verdict).toBe('ALLOW');
  });

  it('masks API keys in successful results', async () => {
    const mockResponse = new Response(
      JSON.stringify({ models: [{ name: 'gpt-4', apiKey: 'sk-secret' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    const request = createMockRequest();
    const result = await executeToolCall(MOCK_GET_TOOL, {}, request);

    expect(result.success).toBe(true);
    const data = result.data as { models: Array<Record<string, unknown>> };
    expect(data.models[0].apiKey).toBe('***');
    expect(data.models[0].name).toBe('gpt-4');
  });

  it('handles HTTP error responses', async () => {
    const mockResponse = new Response('Not Found', { status: 404 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    const request = createMockRequest();
    const result = await executeToolCall(MOCK_GET_TOOL, {}, request);

    expect(result.success).toBe(false);
    expect(result.error).toContain('404');
  });

  it('handles timeout (abort)', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    const request = createMockRequest();
    const result = await executeToolCall(MOCK_GET_TOOL, {}, request);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('handles network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('Network failure'),
    );

    const request = createMockRequest();
    const result = await executeToolCall(MOCK_GET_TOOL, {}, request);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network failure');
  });

  it('executes navigate_to client-side tool without fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const request = createMockRequest();
    const result = await executeToolCall(
      MOCK_CLIENT_TOOL,
      { module: 'scanner' },
      request,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.tool).toBe('navigate_to');
    const data = result.data as { action: string; module: string };
    expect(data.action).toBe('navigate');
    expect(data.module).toBe('scanner');
  });

  it('executes explain_feature client-side tool', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const request = createMockRequest();
    const result = await executeToolCall(
      MOCK_EXPLAIN_TOOL,
      { module: 'scanner' },
      request,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    const data = result.data as { module: string; description: string };
    expect(data.module).toBe('scanner');
    expect(data.description).toBeTruthy();
    expect(typeof data.description).toBe('string');
  });

  it('forwards auth headers from original request', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockResponse);

    const request = createMockRequest();
    await executeToolCall(MOCK_GET_TOOL, {}, request);

    const fetchCall = fetchSpy.mock.calls[0];
    const headers = (fetchCall[1] as RequestInit).headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['sec-fetch-site']).toBe('same-origin');
  });

  it('appends query params for GET requests with args', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockResponse);

    const request = createMockRequest();
    await executeToolCall(MOCK_GET_TOOL, { limit: 10 }, request);

    const fetchUrl = fetchSpy.mock.calls[0][0] as string;
    expect(fetchUrl).toContain('limit=10');
  });

  it('sends body for POST requests', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockResponse);

    const request = createMockRequest();
    await executeToolCall(
      MOCK_POST_TOOL,
      { text: 'test input' },
      request,
    );

    const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(fetchOptions.method).toBe('POST');
    expect(fetchOptions.body).toBe(JSON.stringify({ text: 'test input' }));
  });

  it('truncates large results', async () => {
    const largeData = { content: 'x'.repeat(5000) };
    const mockResponse = new Response(JSON.stringify(largeData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    const request = createMockRequest();
    const result = await executeToolCall(MOCK_GET_TOOL, {}, request);

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data._truncated).toBe(true);
  });
});
