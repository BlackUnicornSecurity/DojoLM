/**
 * Orchestrator Run API Route Tests
 * POST /api/orchestrator/run
 *
 * Test IDs: ORCH-RUN-001 through ORCH-RUN-015
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/orchestrator/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

const VALID_BODY = {
  type: 'pair',
  targetModelId: 'gpt-4',
  attackerModelId: 'gpt-3.5',
  judgeModelId: 'claude-3',
  objective: 'Test the model for vulnerabilities',
};

describe('POST /api/orchestrator/run', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // ORCH-RUN-001: Invalid JSON body returns 400
  it('ORCH-RUN-001: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // ORCH-RUN-002: Missing type returns 400
  it('ORCH-RUN-002: missing type returns 400', async () => {
    const { type: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('type');
  });

  // ORCH-RUN-003: Invalid type returns 400
  it('ORCH-RUN-003: invalid type returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, type: 'invalid-type' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid type');
    expect(json.error).toContain('pair');
  });

  // ORCH-RUN-004: Missing targetModelId returns 400
  it('ORCH-RUN-004: missing targetModelId returns 400', async () => {
    const { targetModelId: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('targetModelId');
  });

  // ORCH-RUN-005: Missing attackerModelId returns 400
  it('ORCH-RUN-005: missing attackerModelId returns 400', async () => {
    const { attackerModelId: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('attackerModelId');
  });

  // ORCH-RUN-006: Missing judgeModelId returns 400
  it('ORCH-RUN-006: missing judgeModelId returns 400', async () => {
    const { judgeModelId: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('judgeModelId');
  });

  // ORCH-RUN-007: Missing objective returns 400
  it('ORCH-RUN-007: missing objective returns 400', async () => {
    const { objective: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('objective');
  });

  // ORCH-RUN-008: Oversized objective returns 413
  it('ORCH-RUN-008: oversized objective returns 413', async () => {
    const req = createPostRequest({ ...VALID_BODY, objective: 'x'.repeat(10_001) });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain('objective too large');
  });

  // ORCH-RUN-009: Invalid category type returns 400
  it('ORCH-RUN-009: invalid category type returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, category: 123 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('category must be a string');
  });

  // ORCH-RUN-010: Invalid maxTurns returns 400
  it('ORCH-RUN-010: invalid maxTurns returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, maxTurns: 101 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('maxTurns');
    expect(json.error).toContain('1 and 100');
  });

  // ORCH-RUN-011: Invalid maxBranches returns 400
  it('ORCH-RUN-011: invalid maxBranches returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, maxBranches: 51 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('maxBranches');
    expect(json.error).toContain('1 and 50');
  });

  // ORCH-RUN-012: Non-integer maxTurns returns 400
  it('ORCH-RUN-012: non-integer maxTurns returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, maxTurns: 5.5 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('maxTurns');
  });

  // ORCH-RUN-013: Valid request returns 200 with run data
  it('ORCH-RUN-013: valid request returns 200', async () => {
    const req = createPostRequest(VALID_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.type).toBe('pair');
    expect(json.data.status).toBe('accepted');
    expect(json.data.config.targetModelId).toBe('gpt-4');
    expect(json.data.config.attackerModelId).toBe('gpt-3.5');
    expect(json.data.config.judgeModelId).toBe('claude-3');
  });

  // ORCH-RUN-014: Valid request with optional fields returns 200 with run data
  it('ORCH-RUN-014: valid request with optional fields returns 200', async () => {
    const req = createPostRequest({ ...VALID_BODY, category: 'prompt-injection', maxTurns: 10, maxBranches: 5 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.config.category).toBe('prompt-injection');
    expect(json.data.config.maxTurns).toBe(10);
    expect(json.data.config.maxBranches).toBe(5);
  });

  // ORCH-RUN-015: OPTIONS returns 200
  it('ORCH-RUN-015: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
