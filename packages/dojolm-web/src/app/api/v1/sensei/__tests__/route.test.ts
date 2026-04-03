/**
 * Sensei v1 API Route Tests
 * POST /api/v1/sensei
 *
 * Test IDs: SENSEI-001 through SENSEI-011
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/v1/sensei', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

describe('POST /api/v1/sensei', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // SENSEI-001: Valid request returns 200
  it('SENSEI-001: valid request with capability returns 200', async () => {
    const req = createPostRequest({ capability: 'detect-injection' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Sensei v1 endpoint ready');
    expect(json.data).toBeNull();
  });

  // SENSEI-002: Invalid JSON returns 400
  it('SENSEI-002: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // SENSEI-003: Array body returns 400
  it('SENSEI-003: array body returns 400', async () => {
    const req = createPostRequest([{ capability: 'detect-injection' }]);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Request body must be a JSON object');
  });

  // SENSEI-004: Missing capability returns 400
  it('SENSEI-004: missing capability returns 400', async () => {
    const req = createPostRequest({});

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: capability (string)');
  });

  // SENSEI-005: Non-string capability returns 400
  it('SENSEI-005: non-string capability returns 400', async () => {
    const req = createPostRequest({ capability: 123 });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: capability (string)');
  });

  // SENSEI-006: Empty string capability returns 400
  it('SENSEI-006: empty string capability returns 400', async () => {
    const req = createPostRequest({ capability: '' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: capability (string)');
  });

  // SENSEI-007: Null capability returns 400
  it('SENSEI-007: null capability returns 400', async () => {
    const req = createPostRequest({ capability: null });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: capability (string)');
  });

  // SENSEI-008: Capability exceeding MAX_TEXT_SIZE returns 413
  it('SENSEI-008: capability exceeding 10000 characters returns 413', async () => {
    const req = createPostRequest({ capability: 'x'.repeat(10_001) });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain('maximum 10000 characters allowed');
  });

  // SENSEI-009: Capability at exact MAX_TEXT_SIZE boundary returns 200
  it('SENSEI-009: capability at exactly 10000 characters returns 200', async () => {
    const req = createPostRequest({ capability: 'x'.repeat(10_000) });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  // SENSEI-010: Boolean capability returns 400
  it('SENSEI-010: boolean capability returns 400', async () => {
    const req = createPostRequest({ capability: true });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: capability (string)');
  });

  // SENSEI-011: OPTIONS returns 200 with Allow header
  it('SENSEI-011: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
