/**
 * Sengoku v1 API Route Tests
 * POST /api/v1/sengoku
 *
 * Test IDs: SENGOKU-001 through SENGOKU-009
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/v1/sengoku', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

describe('POST /api/v1/sengoku', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // SENGOKU-001: Valid request returns 200
  it('SENGOKU-001: valid request with campaignId returns 200', async () => {
    const req = createPostRequest({ campaignId: 'campaign-alpha' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.campaignId).toBe('campaign-alpha');
    expect(json.data.status).toBe('ready');
  });

  // SENGOKU-002: Invalid JSON returns 400
  it('SENGOKU-002: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // SENGOKU-003: Array body returns 400
  it('SENGOKU-003: array body returns 400', async () => {
    const req = createPostRequest([{ campaignId: 'campaign-alpha' }]);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Request body must be a JSON object');
  });

  // SENGOKU-004: Missing campaignId returns 400
  it('SENGOKU-004: missing campaignId returns 400', async () => {
    const req = createPostRequest({});

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: campaignId (string)');
  });

  // SENGOKU-005: Non-string campaignId returns 400
  it('SENGOKU-005: non-string campaignId returns 400', async () => {
    const req = createPostRequest({ campaignId: 123 });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: campaignId (string)');
  });

  // SENGOKU-006: Empty string campaignId returns 400
  it('SENGOKU-006: empty string campaignId returns 400', async () => {
    const req = createPostRequest({ campaignId: '' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: campaignId (string)');
  });

  // SENGOKU-007: Null campaignId returns 400
  it('SENGOKU-007: null campaignId returns 400', async () => {
    const req = createPostRequest({ campaignId: null });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: campaignId (string)');
  });

  // SENGOKU-008: Boolean campaignId returns 400
  it('SENGOKU-008: boolean campaignId returns 400', async () => {
    const req = createPostRequest({ campaignId: true });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing required field: campaignId (string)');
  });

  // SENGOKU-009: OPTIONS returns 200 with Allow header
  it('SENGOKU-009: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
