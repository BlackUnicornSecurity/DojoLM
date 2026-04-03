/**
 * Orchestrator Status API Route Tests
 * GET /api/orchestrator/status
 *
 * Test IDs: ORCH-STAT-001 through ORCH-STAT-008
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/route-guard', () => ({
  withAuth: (handler: Function, _opts: unknown) => handler,
}));

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:42001/api/orchestrator/status');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url.toString(), {
    method: 'GET',
  });
}

describe('GET /api/orchestrator/status', () => {
  let GET: any;
  let OPTIONS: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../route');
    GET = mod.GET;
    OPTIONS = mod.OPTIONS;
  });

  // ORCH-STAT-001: Missing runId returns 400
  it('ORCH-STAT-001: missing runId returns 400', async () => {
    const req = createGetRequest();
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('runId');
  });

  // ORCH-STAT-002: Empty runId returns 400
  it('ORCH-STAT-002: empty runId returns 400', async () => {
    const req = createGetRequest({ runId: '' });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('runId');
  });

  // ORCH-STAT-003: Whitespace-only runId returns 400
  it('ORCH-STAT-003: whitespace-only runId returns 400', async () => {
    const req = createGetRequest({ runId: '   ' });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('runId');
  });

  // ORCH-STAT-004: runId too long returns 400
  it('ORCH-STAT-004: runId too long (>128 chars) returns 400', async () => {
    const req = createGetRequest({ runId: 'x'.repeat(129) });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('too long');
    expect(json.error).toContain('128');
  });

  // ORCH-STAT-005: Valid runId returns 200
  it('ORCH-STAT-005: valid runId returns 200 with status data', async () => {
    const req = createGetRequest({ runId: 'run-abc-123' });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.runId).toBe('run-abc-123');
    expect(json.data.status).toBe('pending');
    expect(json.data.progress).toBe(0);
  });

  // ORCH-STAT-006: Valid runId at max length returns 200
  it('ORCH-STAT-006: valid runId at exactly 128 chars returns 200', async () => {
    const runId = 'x'.repeat(128);
    const req = createGetRequest({ runId });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.runId).toBe(runId);
  });

  // ORCH-STAT-007: Response includes expected structure
  it('ORCH-STAT-007: response includes expected status structure', async () => {
    const req = createGetRequest({ runId: 'run-test-1' });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty('runId');
    expect(json.data).toHaveProperty('status');
    expect(json.data).toHaveProperty('progress');
    expect(json.data).toHaveProperty('startedAt');
    expect(json.data).toHaveProperty('completedAt');
  });

  // ORCH-STAT-008: OPTIONS returns 200
  it('ORCH-STAT-008: OPTIONS returns 200 with Allow header', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('Allow')).toBe('GET, OPTIONS');
  });
});
