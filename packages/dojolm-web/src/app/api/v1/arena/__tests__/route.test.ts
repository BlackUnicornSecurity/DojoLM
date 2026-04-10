/**
 * Arena v1 API Route Tests
 * POST /api/v1/arena
 *
 * Test IDs: ARENA-001 through ARENA-010
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/v1/arena', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

describe('POST /api/v1/arena', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // ARENA-001: Valid request returns 200
  it('ARENA-001: valid request with mode and modelId returns 200', async () => {
    const req = createPostRequest({ mode: 'kunai', modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.status).toBe('ready');
  });

  // ARENA-002: Invalid JSON returns 400
  it('ARENA-002: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // ARENA-003: Array body returns 400
  it('ARENA-003: array body returns 400', async () => {
    const req = createPostRequest([{ mode: 'attack', modelId: 'gpt-4' }]);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Request body must be a JSON object');
  });

  // ARENA-004: Missing mode returns 400
  it('ARENA-004: missing mode returns 400', async () => {
    const req = createPostRequest({ modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: mode (string)');
  });

  // ARENA-005: Missing modelId returns 400
  it('ARENA-005: missing modelId returns 400', async () => {
    const req = createPostRequest({ mode: 'kunai' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // ARENA-006: Non-string mode returns 400
  it('ARENA-006: non-string mode returns 400', async () => {
    const req = createPostRequest({ mode: 123, modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: mode (string)');
  });

  // ARENA-007: Non-string modelId returns 400
  it('ARENA-007: non-string modelId returns 400', async () => {
    const req = createPostRequest({ mode: 'kunai', modelId: 42 });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // ARENA-008: Empty string mode returns 400
  it('ARENA-008: empty string mode returns 400', async () => {
    const req = createPostRequest({ mode: '', modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: mode (string)');
  });

  // ARENA-009: Empty string modelId returns 400
  it('ARENA-009: empty string modelId returns 400', async () => {
    const req = createPostRequest({ mode: 'kunai', modelId: '' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // ARENA-010: OPTIONS returns 200 with Allow header
  it('ARENA-010: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });

  // ARENA-011: Valid response includes deprecation headers and body fields
  it('ARENA-011: valid response includes deprecation headers and body fields', async () => {
    const req = createPostRequest({ mode: 'kunai', modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Sunset')).toContain('2026');
    expect(res.headers.get('Deprecation')).toBeDefined();
    expect(json.deprecated).toBe(true);
    expect(json.sunset).toBeDefined();
    expect(json.migration).toBeDefined();
  });
});
