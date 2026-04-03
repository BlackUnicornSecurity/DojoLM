/**
 * Sensei Generate API Route Tests
 * POST /api/sensei/generate
 *
 * Test IDs: SEN-GEN-001 through SEN-GEN-015
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/sensei/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

const VALID_BODY = {
  category: 'prompt-injection',
  count: 5,
};

describe('POST /api/sensei/generate', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // SEN-GEN-001: Invalid JSON body returns 400
  it('SEN-GEN-001: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // SEN-GEN-002: Missing category returns 400
  it('SEN-GEN-002: missing category returns 400', async () => {
    const req = createPostRequest({ count: 5 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('category');
  });

  // SEN-GEN-003: Invalid category returns 400
  it('SEN-GEN-003: invalid category returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, category: 'unknown-cat' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid category');
    expect(json.error).toContain('prompt-injection');
  });

  // SEN-GEN-004: Missing count returns 400
  it('SEN-GEN-004: missing count returns 400', async () => {
    const req = createPostRequest({ category: 'prompt-injection' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('count');
  });

  // SEN-GEN-005: Count below range returns 400
  it('SEN-GEN-005: count of 0 returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, count: 0 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('count');
  });

  // SEN-GEN-006: Count above range returns 400
  it('SEN-GEN-006: count of 101 returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, count: 101 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('count');
  });

  // SEN-GEN-007: Non-integer count returns 400
  it('SEN-GEN-007: non-integer count returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, count: 5.5 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('count');
  });

  // SEN-GEN-008: Invalid severity type returns 400
  it('SEN-GEN-008: invalid severity type returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, severity: 123 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('severity must be a string');
  });

  // SEN-GEN-009: Oversized context returns 413
  it('SEN-GEN-009: context exceeding 10000 chars returns 413', async () => {
    const req = createPostRequest({ ...VALID_BODY, context: 'x'.repeat(10_001) });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain('context too large');
  });

  // SEN-GEN-010: Invalid context type returns 400
  it('SEN-GEN-010: non-string context returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, context: 123 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('context must be a string');
  });

  // SEN-GEN-011: Invalid temperature returns 400
  it('SEN-GEN-011: temperature out of range returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, temperature: 3 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('temperature');
    expect(json.error).toContain('0 and 2');
  });

  // SEN-GEN-012: Invalid maxTokens returns 400
  it('SEN-GEN-012: non-positive maxTokens returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, maxTokens: 0 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('maxTokens');
  });

  // SEN-GEN-013: Invalid routing type returns 400
  it('SEN-GEN-013: routing as non-object returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, routing: 'invalid' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('routing must be an object');
  });

  // SEN-GEN-014: Invalid routing.mode returns 400
  it('SEN-GEN-014: invalid routing.mode returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, routing: { mode: 'invalid-mode' } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid routing.mode');
    expect(json.error).toContain('local');
  });

  // SEN-GEN-015: Valid request returns 200
  it('SEN-GEN-015: valid request with all optional fields returns 200', async () => {
    const req = createPostRequest({
      ...VALID_BODY,
      severity: 'high',
      context: 'Test context',
      temperature: 0.7,
      maxTokens: 1024,
      routing: { mode: 'local' },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.params.category).toBe('prompt-injection');
    expect(json.params.count).toBe(5);
    expect(json.params.severity).toBe('high');
    expect(json.params.temperature).toBe(0.7);
    expect(json.params.maxTokens).toBe(1024);
  });

  // SEN-GEN-016: OPTIONS returns 200
  it('SEN-GEN-016: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
