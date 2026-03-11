/**
 * File: route.test.ts
 * Tests: HLT-001 to HLT-010
 * Coverage: GET /api/health
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAdminHealthGET = vi.fn();

vi.mock('@/app/api/admin/health/route', () => ({
  GET: (...args: unknown[]) => mockAdminHealthGET(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/health', {
    method: 'GET',
    headers,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  let GET: typeof import('../route').GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import('../route'));

    mockAdminHealthGET.mockResolvedValue(
      NextResponse.json(
        { status: 'healthy', uptime: 12345 },
        { status: 200 },
      ),
    );
  });

  // HLT-001
  it('HLT-001: returns 200', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
  });

  // HLT-002
  it('HLT-002: delegates to admin health GET handler', async () => {
    await GET(makeGetRequest());
    expect(mockAdminHealthGET).toHaveBeenCalledTimes(1);
  });

  // HLT-003
  it('HLT-003: passes the original request through', async () => {
    const req = makeGetRequest();
    await GET(req);
    expect(mockAdminHealthGET).toHaveBeenCalledWith(req);
  });

  // HLT-004
  it('HLT-004: returns the response from admin health', async () => {
    const res = await GET(makeGetRequest());
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.uptime).toBe(12345);
  });

  // HLT-005
  it('HLT-005: forwards x-api-key header in request', async () => {
    const req = makeGetRequest({ 'x-api-key': 'secret-key' });
    await GET(req);
    const passedReq = mockAdminHealthGET.mock.calls[0][0] as NextRequest;
    expect(passedReq.headers.get('x-api-key')).toBe('secret-key');
  });

  // HLT-006
  it('HLT-006: returns error status from admin health if unhealthy', async () => {
    mockAdminHealthGET.mockResolvedValue(
      NextResponse.json({ status: 'unhealthy' }, { status: 503 }),
    );
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(503);
  });

  // HLT-007
  it('HLT-007: returns JSON content type', async () => {
    const res = await GET(makeGetRequest());
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  // HLT-008
  it('HLT-008: handles admin health returning 401', async () => {
    mockAdminHealthGET.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  // HLT-009
  it('HLT-009: works without x-api-key header', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(mockAdminHealthGET).toHaveBeenCalledTimes(1);
  });

  // HLT-010
  it('HLT-010: propagates rejection from admin health', async () => {
    mockAdminHealthGET.mockRejectedValue(new Error('admin health error'));
    await expect(GET(makeGetRequest())).rejects.toThrow('admin health error');
  });
});
