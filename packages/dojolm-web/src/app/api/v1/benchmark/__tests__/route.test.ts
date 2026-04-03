/**
 * Benchmark v1 API Route Tests
 * POST /api/v1/benchmark
 *
 * Test IDs: BENCH-001 through BENCH-010
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/v1/benchmark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

describe('POST /api/v1/benchmark', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // BENCH-001: Valid request returns 200
  it('BENCH-001: valid request with suiteId and modelId returns 200', async () => {
    const req = createPostRequest({ suiteId: 'suite-001', modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Benchmark v1 endpoint ready');
    expect(json.data).toBeNull();
  });

  // BENCH-002: Invalid JSON returns 400
  it('BENCH-002: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // BENCH-003: Array body returns 400
  it('BENCH-003: array body returns 400', async () => {
    const req = createPostRequest([{ suiteId: 'suite-001', modelId: 'gpt-4' }]);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Request body must be a JSON object');
  });

  // BENCH-004: Missing suiteId returns 400
  it('BENCH-004: missing suiteId returns 400', async () => {
    const req = createPostRequest({ modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: suiteId (string)');
  });

  // BENCH-005: Missing modelId returns 400
  it('BENCH-005: missing modelId returns 400', async () => {
    const req = createPostRequest({ suiteId: 'suite-001' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // BENCH-006: Non-string suiteId returns 400
  it('BENCH-006: non-string suiteId returns 400', async () => {
    const req = createPostRequest({ suiteId: 123, modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: suiteId (string)');
  });

  // BENCH-007: Non-string modelId returns 400
  it('BENCH-007: non-string modelId returns 400', async () => {
    const req = createPostRequest({ suiteId: 'suite-001', modelId: 42 });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // BENCH-008: Empty string suiteId returns 400
  it('BENCH-008: empty string suiteId returns 400', async () => {
    const req = createPostRequest({ suiteId: '', modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: suiteId (string)');
  });

  // BENCH-009: Empty string modelId returns 400
  it('BENCH-009: empty string modelId returns 400', async () => {
    const req = createPostRequest({ suiteId: 'suite-001', modelId: '' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // BENCH-010: OPTIONS returns 200 with Allow header
  it('BENCH-010: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
