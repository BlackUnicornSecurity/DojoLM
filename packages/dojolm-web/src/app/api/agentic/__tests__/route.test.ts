/**
 * Agentic API Route Tests
 * POST /api/agentic
 *
 * Test IDs: AGEN-001 through AGEN-012
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createPostRequest(body: unknown): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost:42001/api/agentic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
}

const VALID_BODY = {
  architecture: 'single-agent',
  categories: ['prompt-injection'],
  difficulty: 'medium',
  objective: 'Test the model for prompt injection vulnerabilities',
  targetModelId: 'gpt-4',
};

describe('POST /api/agentic', () => {
  let POST: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    POST = mod.POST;
    OPTIONS = mod.OPTIONS;
  });

  // AGEN-001: Invalid JSON body returns 400
  it('AGEN-001: invalid JSON body returns 400', async () => {
    const req = createPostRequest('not valid json {{{');
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  // AGEN-002: Missing architecture returns 400
  it('AGEN-002: missing architecture returns 400', async () => {
    const { architecture: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('architecture');
  });

  // AGEN-003: Invalid architecture returns 400
  it('AGEN-003: invalid architecture returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, architecture: 'chaos' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid architecture');
    expect(json.error).toContain('single-agent');
  });

  // AGEN-004: Missing categories returns 400
  it('AGEN-004: missing categories returns 400', async () => {
    const { categories: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('categories');
  });

  // AGEN-005: Empty categories array returns 400
  it('AGEN-005: empty categories array returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, categories: [] });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('categories');
  });

  // AGEN-006: Invalid category value returns 400
  it('AGEN-006: invalid category value returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, categories: ['prompt-injection', 'invalid-cat'] });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid category');
    expect(json.error).toContain('invalid-cat');
  });

  // AGEN-007: Missing difficulty returns 400
  it('AGEN-007: missing difficulty returns 400', async () => {
    const { difficulty: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('difficulty');
  });

  // AGEN-008: Invalid difficulty returns 400
  it('AGEN-008: invalid difficulty returns 400', async () => {
    const req = createPostRequest({ ...VALID_BODY, difficulty: 'nightmare' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid difficulty');
    expect(json.error).toContain('easy');
  });

  // AGEN-009: Missing objective returns 400
  it('AGEN-009: missing objective returns 400', async () => {
    const { objective: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('objective');
  });

  // AGEN-010: Oversized objective returns 413
  it('AGEN-010: oversized objective returns 413', async () => {
    const req = createPostRequest({ ...VALID_BODY, objective: 'x'.repeat(10_001) });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain('objective too large');
  });

  // AGEN-011: Missing targetModelId returns 400
  it('AGEN-011: missing targetModelId returns 400', async () => {
    const { targetModelId: _, ...body } = VALID_BODY;
    const req = createPostRequest(body);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('targetModelId');
  });

  // AGEN-012: Valid request returns 200 with environment data
  it('AGEN-012: valid request returns 200', async () => {
    const req = createPostRequest(VALID_BODY);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.architecture).toBe('single-agent');
    expect(json.data.categories).toEqual(['prompt-injection']);
    expect(json.data.difficulty).toBe('medium');
    expect(json.data.targetModelId).toBe('gpt-4');
    expect(json.data.environmentReady).toBe(true);
  });

  // AGEN-013: OPTIONS returns 200
  it('AGEN-013: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
