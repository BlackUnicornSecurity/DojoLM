/**
 * TimeChamber v1 API Route Tests
 * POST /api/v1/timechamber
 *
 * Test IDs: TC-001 through TC-010
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/v1/timechamber', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

describe('POST /api/v1/timechamber', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // TC-001: Valid request returns 200
  it('TC-001: valid request with planId and modelId returns 200', async () => {
    const req = createPostRequest({ planId: 'plan-001', modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.planId).toBe('plan-001');
    expect(json.data.status).toBe('ready');
  });

  // TC-002: Invalid JSON returns 400
  it('TC-002: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // TC-003: Array body returns 400
  it('TC-003: array body returns 400', async () => {
    const req = createPostRequest([{ planId: 'plan-001', modelId: 'gpt-4' }]);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Request body must be a JSON object');
  });

  // TC-004: Missing planId returns 400
  it('TC-004: missing planId returns 400', async () => {
    const req = createPostRequest({ modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: planId (string)');
  });

  // TC-005: Missing modelId returns 400
  it('TC-005: missing modelId returns 400', async () => {
    const req = createPostRequest({ planId: 'plan-001' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // TC-006: Non-string planId returns 400
  it('TC-006: non-string planId returns 400', async () => {
    const req = createPostRequest({ planId: 123, modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: planId (string)');
  });

  // TC-007: Non-string modelId returns 400
  it('TC-007: non-string modelId returns 400', async () => {
    const req = createPostRequest({ planId: 'plan-001', modelId: 42 });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // TC-008: Empty string planId returns 400
  it('TC-008: empty string planId returns 400', async () => {
    const req = createPostRequest({ planId: '', modelId: 'gpt-4' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: planId (string)');
  });

  // TC-009: Empty string modelId returns 400
  it('TC-009: empty string modelId returns 400', async () => {
    const req = createPostRequest({ planId: 'plan-001', modelId: '' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelId (string)');
  });

  // TC-010: OPTIONS returns 200 with Allow header
  it('TC-010: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
