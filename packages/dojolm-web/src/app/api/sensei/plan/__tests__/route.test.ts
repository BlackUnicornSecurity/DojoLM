/**
 * Sensei Plan API Route Tests
 * POST /api/sensei/plan
 *
 * Test IDs: SEN-PLN-001 through SEN-PLN-015
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/sensei/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

const VALID_BODY = {
  attackType: 'prompt-injection',
  targetDescription: 'A chatbot that assists with customer service',
  maxTurns: 10,
};

describe('POST /api/sensei/plan', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // SEN-PLN-001: Invalid JSON body returns 400
  it('SEN-PLN-001: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // SEN-PLN-002: Missing attackType returns 400
  it('SEN-PLN-002: missing attackType returns 400', async () => {
    const { attackType: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('attackType');
  });

  // SEN-PLN-003: Oversized attackType returns 413
  it('SEN-PLN-003: oversized attackType returns 413', async () => {
    const req = createPostRequest({ ...VALID_BODY, attackType: 'x'.repeat(10_001) });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain('attackType too large');
  });

  // SEN-PLN-004: Missing targetDescription returns 400
  it('SEN-PLN-004: missing targetDescription returns 400', async () => {
    const { targetDescription: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('targetDescription');
  });

  // SEN-PLN-005: Oversized targetDescription returns 413
  it('SEN-PLN-005: oversized targetDescription returns 413', async () => {
    const req = createPostRequest({ ...VALID_BODY, targetDescription: 'x'.repeat(10_001) });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain('targetDescription too large');
  });

  // SEN-PLN-006: Missing maxTurns returns 400
  it('SEN-PLN-006: missing maxTurns returns 400', async () => {
    const { maxTurns: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('maxTurns');
  });

  // SEN-PLN-007: maxTurns below range returns 400
  it('SEN-PLN-007: maxTurns of 0 returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, maxTurns: 0 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('maxTurns');
  });

  // SEN-PLN-008: maxTurns above range returns 400
  it('SEN-PLN-008: maxTurns of 51 returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, maxTurns: 51 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('maxTurns');
  });

  // SEN-PLN-009: Non-integer maxTurns returns 400
  it('SEN-PLN-009: non-integer maxTurns returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, maxTurns: 5.5 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('maxTurns');
  });

  // SEN-PLN-010: Invalid context type returns 400
  it('SEN-PLN-010: non-string context returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, context: 123 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('context must be a string');
  });

  // SEN-PLN-011: Oversized context returns 413
  it('SEN-PLN-011: context exceeding 10000 chars returns 413', async () => {
    const req = createPostRequest({ ...VALID_BODY, context: 'x'.repeat(10_001) });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain('context too large');
  });

  // SEN-PLN-012: Invalid routing type returns 400
  it('SEN-PLN-012: routing as non-object returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, routing: 'invalid' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('routing must be an object');
  });

  // SEN-PLN-013: Invalid routing.mode returns 400
  it('SEN-PLN-013: invalid routing.mode returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, routing: { mode: 'bad-mode' } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid routing.mode');
    expect(json.error).toContain('local');
  });

  // SEN-PLN-014: Valid request returns 503 (Sensei provider unavailable in test env)
  it('SEN-PLN-014: valid request returns 503 graceful degradation', async () => {
    const req = createPostRequest(VALID_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Sensei service unavailable — provider not connected');
    expect(json.data).toBeNull();
    expect(json.params.attackType).toBe('prompt-injection');
    expect(json.params.targetDescriptionLength).toBe(VALID_BODY.targetDescription.length);
    expect(json.params.maxTurns).toBe(10);
  });

  // SEN-PLN-015: Valid request with optional fields returns 503 (Sensei provider unavailable in test env)
  it('SEN-PLN-015: valid request with optional fields returns 503 graceful degradation', async () => {
    const req = createPostRequest({ ...VALID_BODY, context: 'Additional context', routing: { mode: 'hybrid' } });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Sensei service unavailable — provider not connected');
    expect(json.data).toBeNull();
  });

  // SEN-PLN-016: OPTIONS returns 200
  it('SEN-PLN-016: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
